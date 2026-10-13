-- ============================================================================
-- MIGRATION 20: Fix Multi-Organization RLS, Organization Creation RPC & Default Survey Seed
-- ============================================================================

-- 1. Update get_user_organization_id() to deterministically prefer profile's active org or newest membership
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT p.organization_id
      FROM public.profiles p
      JOIN public.organization_members om
        ON om.organization_id = p.organization_id AND om.user_id = p.id
      WHERE p.id = auth.uid() AND om.status = 'active'
      LIMIT 1
    ),
    (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid() AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    )
  );
$$;

-- 2. Upgrade create_new_organization_owner RPC:
--    - Idempotent by (user_id, organization name) to prevent accidental duplicates
--    - Automatically seeds a default active NPS survey + default questions for the new organization
CREATE OR REPLACE FUNCTION public.create_new_organization_owner(
    p_org_name TEXT,
    p_user_email TEXT DEFAULT NULL,
    p_user_full_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_org_id UUID;
    v_survey_id UUID;
    v_clean_name TEXT := TRIM(p_org_name);
    v_clean_email TEXT;
BEGIN
    -- 1. Resolver e-mail
    IF p_user_email IS NOT NULL AND TRIM(p_user_email) <> '' THEN
        v_clean_email := LOWER(TRIM(p_user_email));
    END IF;

    -- Se auth.uid() for nulo, resolver v_user_id pelo e-mail em auth.users
    IF v_user_id IS NULL AND v_clean_email IS NOT NULL THEN
        SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = v_clean_email LIMIT 1;
    END IF;

    -- Validar autenticação / identificação do usuário
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Acesso negado: Usuário não autenticado ou não encontrado.';
    END IF;

    IF v_clean_name IS NULL OR v_clean_name = '' THEN
        RAISE EXCEPTION 'Nome da organização é obrigatório.';
    END IF;

    -- Se v_clean_email ainda for nulo, obter da conta em auth.users
    IF v_clean_email IS NULL THEN
        SELECT email INTO v_clean_email FROM auth.users WHERE id = v_user_id;
    END IF;

    -- 2. Verificar se o usuário já possui organização ativa com o mesmo nome (idempotência)
    SELECT o.id INTO v_org_id
    FROM public.organizations o
    JOIN public.organization_members om ON om.organization_id = o.id
    WHERE om.user_id = v_user_id
      AND LOWER(TRIM(o.name)) = LOWER(v_clean_name)
    ORDER BY o.created_at DESC
    LIMIT 1;

    -- Se não existir, criar nova organização
    IF v_org_id IS NULL THEN
        INSERT INTO public.organizations (name)
        VALUES (v_clean_name)
        RETURNING id INTO v_org_id;
    END IF;

    -- 3. Inserir/Atualizar Membership em organization_members como OWNER
    INSERT INTO public.organization_members (organization_id, user_id, role, status)
    VALUES (v_org_id, v_user_id, 'owner', 'active')
    ON CONFLICT (organization_id, user_id)
    DO UPDATE SET role = 'owner', status = 'active', updated_at = now();

    -- 4. Inserir/Atualizar Profile do Usuário em profiles (role: 'admin'::user_role)
    INSERT INTO public.profiles (id, organization_id, email, full_name, role)
    VALUES (
        v_user_id,
        v_org_id,
        v_clean_email,
        COALESCE(NULLIF(TRIM(p_user_full_name), ''), v_clean_email),
        'admin'::user_role
    )
    ON CONFLICT (id)
    DO UPDATE SET
        organization_id = v_org_id,
        role = 'admin'::user_role,
        full_name = COALESCE(NULLIF(TRIM(p_user_full_name), ''), profiles.full_name);

    -- 5. Garantir pesquisa padrão ativa (Pesquisa de Satisfação NPS) para a organização
    SELECT id INTO v_survey_id
    FROM public.surveys
    WHERE organization_id = v_org_id AND is_active = true
    LIMIT 1;

    IF v_survey_id IS NULL THEN
        INSERT INTO public.surveys (organization_id, title, description, is_active, is_anonymous_allowed)
        VALUES (
            v_org_id,
            'Pesquisa de Satisfação NPS',
            'Pesquisa oficial de satisfação e Net Promoter Score',
            true,
            true
        )
        RETURNING id INTO v_survey_id;

        INSERT INTO public.questions (survey_id, question_type, title, is_required, order_index, is_active)
        VALUES
            (v_survey_id, 'nps', 'Em uma escala de 0 a 10, o quanto você recomendaria nossa academia a um amigo ou familiar?', true, 1, true),
            (v_survey_id, 'text', 'O que motivou sua nota? Deixe seu elogio, crítica ou sugestão.', false, 2, true);
    END IF;

    RETURN v_org_id;
END;
$$;

-- 3. Update multi-organization RLS policies to support users with multiple organizations
DROP POLICY IF EXISTS "Members can view members of their organization" ON public.organization_members;
CREATE POLICY "Members can view members of their organization"
ON public.organization_members
FOR SELECT
USING (
  user_id = auth.uid()
  OR organization_id IN (SELECT public.get_user_organization_ids())
);

DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;
CREATE POLICY "Users can view profiles in their organization"
ON public.profiles
FOR SELECT
USING (
  id = auth.uid()
  OR organization_id IN (SELECT public.get_user_organization_ids())
);

DROP POLICY IF EXISTS "Users can view units of their organization" ON public.units;
CREATE POLICY "Users can view units of their organization"
ON public.units
FOR SELECT
USING (
  organization_id IN (SELECT public.get_user_organization_ids())
  AND public.has_unit_access(id)
);

DROP POLICY IF EXISTS "Members can view responses of their org" ON public.responses;
CREATE POLICY "Members can view responses of their org"
ON public.responses
FOR SELECT
USING (
  organization_id IN (SELECT public.get_user_organization_ids())
);

DROP POLICY IF EXISTS "Members can insert responses of their org" ON public.responses;
CREATE POLICY "Members can insert responses of their org"
ON public.responses
FOR INSERT
WITH CHECK (
  organization_id IN (SELECT public.get_user_organization_ids())
  AND (unit_id IS NULL OR public.has_unit_access(unit_id))
);

DROP POLICY IF EXISTS "Members can view cases of their org" ON public.follow_up_cases;
CREATE POLICY "Members can view cases of their org"
ON public.follow_up_cases
FOR SELECT
USING (
  organization_id IN (SELECT public.get_user_organization_ids())
);

DROP POLICY IF EXISTS "Members can update cases of their org" ON public.follow_up_cases;
CREATE POLICY "Members can update cases of their org"
ON public.follow_up_cases
FOR ALL
USING (
  organization_id IN (SELECT public.get_user_organization_ids())
);

DROP POLICY IF EXISTS "Members can view comm logs of their org" ON public.communication_logs;
CREATE POLICY "Members can view comm logs of their org"
ON public.communication_logs
FOR SELECT
USING (
  organization_id IN (SELECT public.get_user_organization_ids())
);

DROP POLICY IF EXISTS "Members can insert comm logs of their org" ON public.communication_logs;
CREATE POLICY "Members can insert comm logs of their org"
ON public.communication_logs
FOR INSERT
WITH CHECK (
  organization_id IN (SELECT public.get_user_organization_ids())
);
