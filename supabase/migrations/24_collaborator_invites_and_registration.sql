-- =====================================================================
-- 24_collaborator_invites_and_registration.sql
-- 1. Creates public.organization_invites table to support inviting emails
--    that do not yet have an account in auth.users.
-- 2. Upgrades public.invite_organization_member to support both existing users
--    and new pending invitations with a shareable invite token.
-- 3. Adds public.get_invite_by_token (public RPC) and
--    public.accept_organization_invite (authenticated RPC) so invited
--    collaborators can register and join the organization seamlessly.
-- 4. Adds default args to public.create_new_organization_owner so both
--    1-arg and 3-arg calls work without PostgREST overload conflict.
-- =====================================================================

-- 1. Create organization_invites table
CREATE TABLE IF NOT EXISTS public.organization_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'operator',
    token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'revoked'
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    accepted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_org_invites_org_id ON public.organization_invites(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_email ON public.organization_invites(lower(email));
CREATE INDEX IF NOT EXISTS idx_org_invites_token ON public.organization_invites(token);

ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view invites" ON public.organization_invites;
CREATE POLICY "Org members can view invites"
ON public.organization_invites
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = organization_invites.organization_id
          AND om.user_id = auth.uid()
          AND om.status = 'active'
    )
    OR lower(email) = lower(auth.jwt() ->> 'email')
);

DROP POLICY IF EXISTS "Org admins can manage invites" ON public.organization_invites;
CREATE POLICY "Org admins can manage invites"
ON public.organization_invites
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = organization_invites.organization_id
          AND om.user_id = auth.uid()
          AND om.role IN ('owner', 'admin')
          AND om.status = 'active'
    )
);

-- 2. Upgrade invite_organization_member RPC (drop old 3-arg first to avoid overload)
DROP FUNCTION IF EXISTS public.invite_organization_member(uuid, text, text);
DROP FUNCTION IF EXISTS public.invite_organization_member(uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.invite_organization_member(
    p_org_id UUID,
    p_user_email TEXT,
    p_role TEXT DEFAULT 'operator',
    p_full_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_role TEXT;
    v_target_user_id UUID;
    v_existing_member_id UUID;
    v_member_id UUID;
    v_invite_id UUID;
    v_invite_token TEXT;
    v_clean_email TEXT := lower(trim(p_user_email));
    v_clean_name TEXT := NULLIF(trim(COALESCE(p_full_name, '')), '');
BEGIN
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Autenticação necessária.');
    END IF;

    IF v_clean_email IS NULL OR v_clean_email = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'E-mail do colaborador é obrigatório.');
    END IF;

    -- 1. Check caller permissions
    SELECT role INTO v_caller_role
    FROM public.organization_members
    WHERE user_id = v_caller_id AND organization_id = p_org_id AND status = 'active';

    IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Apenas Administradores ou Proprietários podem convidar colaboradores.');
    END IF;

    -- 2. Check if target user already exists in auth.users
    SELECT id INTO v_target_user_id
    FROM auth.users
    WHERE lower(email) = v_clean_email
    LIMIT 1;

    IF v_target_user_id IS NOT NULL THEN
        -- Ensure profile exists and update name if missing
        INSERT INTO public.profiles (id, email, full_name, organization_id, role)
        VALUES (
            v_target_user_id,
            v_clean_email,
            COALESCE(v_clean_name, split_part(v_clean_email, '@', 1)),
            p_org_id,
            CASE WHEN p_role IN ('owner', 'admin') THEN 'admin'::public.user_role ELSE 'unit_manager'::public.user_role END
        )
        ON CONFLICT (id) DO UPDATE
        SET full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name);

        -- Check if membership already exists
        SELECT id INTO v_existing_member_id
        FROM public.organization_members
        WHERE organization_id = p_org_id AND user_id = v_target_user_id;

        IF v_existing_member_id IS NOT NULL THEN
            UPDATE public.organization_members
            SET role = p_role, status = 'active', updated_at = now()
            WHERE id = v_existing_member_id
            RETURNING id INTO v_member_id;
        ELSE
            INSERT INTO public.organization_members (organization_id, user_id, role, status, created_at, updated_at)
            VALUES (p_org_id, v_target_user_id, p_role, 'active', now(), now())
            RETURNING id INTO v_member_id;
        END IF;

        -- Mark any pending invite for this email in this org as accepted
        UPDATE public.organization_invites
        SET status = 'accepted', accepted_at = now(), updated_at = now()
        WHERE organization_id = p_org_id AND lower(email) = v_clean_email AND status = 'pending';

        RETURN jsonb_build_object(
            'success', true,
            'already_registered', true,
            'member_id', v_member_id,
            'message', 'Este e-mail já possui conta cadastrada e foi vinculado imediatamente como Ativo! Basta ele entrar com o e-mail e senha dele.'
        );
    END IF;

    -- 3. Target user does NOT exist in auth.users yet -> Create or update pending invite
    SELECT id, token INTO v_invite_id, v_invite_token
    FROM public.organization_invites
    WHERE organization_id = p_org_id AND lower(email) = v_clean_email AND status = 'pending'
    LIMIT 1;

    IF v_invite_id IS NOT NULL THEN
        UPDATE public.organization_invites
        SET role = p_role,
            full_name = COALESCE(v_clean_name, full_name),
            updated_at = now()
        WHERE id = v_invite_id;
    ELSE
        v_invite_token := encode(gen_random_bytes(16), 'hex');
        INSERT INTO public.organization_invites (
            organization_id, email, full_name, role, token, status, created_by
        ) VALUES (
            p_org_id, v_clean_email, COALESCE(v_clean_name, split_part(v_clean_email, '@', 1)), p_role, v_invite_token, 'pending', v_caller_id
        )
        RETURNING id INTO v_invite_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'already_registered', false,
        'invite_id', v_invite_id,
        'invite_token', v_invite_token,
        'message', 'Convite gerado! Como este e-mail ainda não tem conta, envie o link de convite pelo WhatsApp ou copie o link para ele criar a senha.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.invite_organization_member(UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- 3. Public RPC to inspect an invite token on the Login/Register screen
CREATE OR REPLACE FUNCTION public.get_invite_by_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_inv RECORD;
BEGIN
    IF p_token IS NULL OR trim(p_token) = '' THEN
        RETURN NULL;
    END IF;

    SELECT
        i.id,
        i.organization_id,
        i.email,
        i.full_name,
        i.role,
        i.status,
        i.token,
        o.name AS organization_name,
        COALESCE(o.trade_name, o.name) AS organization_trade_name
    INTO v_inv
    FROM public.organization_invites i
    JOIN public.organizations o ON o.id = i.organization_id
    WHERE i.token = trim(p_token)
    LIMIT 1;

    IF v_inv IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN jsonb_build_object(
        'id', v_inv.id,
        'organization_id', v_inv.organization_id,
        'organization_name', v_inv.organization_trade_name,
        'email', v_inv.email,
        'full_name', v_inv.full_name,
        'role', v_inv.role,
        'status', v_inv.status,
        'token', v_inv.token
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_invite_by_token(TEXT) TO anon, authenticated, service_role;

-- 4. Authenticated RPC to accept pending invites (by token or by authenticated user's email)
CREATE OR REPLACE FUNCTION public.accept_organization_invite(p_token TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_email TEXT;
    v_user_name TEXT;
    v_inv RECORD;
    v_accepted_org_id UUID := NULL;
    v_count INTEGER := 0;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado.');
    END IF;

    SELECT email, COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
    INTO v_user_email, v_user_name
    FROM auth.users
    WHERE id = v_user_id;

    FOR v_inv IN
        SELECT *
        FROM public.organization_invites
        WHERE status = 'pending'
          AND (
              (p_token IS NOT NULL AND trim(p_token) <> '' AND token = trim(p_token))
              OR lower(email) = lower(v_user_email)
          )
        ORDER BY created_at DESC
    LOOP
        -- Ensure profile exists
        INSERT INTO public.profiles (id, email, full_name, organization_id, role)
        VALUES (
            v_user_id,
            v_user_email,
            COALESCE(NULLIF(v_inv.full_name, ''), v_user_name),
            v_inv.organization_id,
            CASE WHEN v_inv.role IN ('owner', 'admin') THEN 'admin'::public.user_role ELSE 'unit_manager'::public.user_role END
        )
        ON CONFLICT (id) DO UPDATE
        SET organization_id = COALESCE(public.profiles.organization_id, EXCLUDED.organization_id),
            full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name);

        -- Upsert organization_members
        IF EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = v_inv.organization_id AND user_id = v_user_id
        ) THEN
            UPDATE public.organization_members
            SET role = v_inv.role, status = 'active', updated_at = now()
            WHERE organization_id = v_inv.organization_id AND user_id = v_user_id;
        ELSE
            INSERT INTO public.organization_members (organization_id, user_id, role, status, created_at, updated_at)
            VALUES (v_inv.organization_id, v_user_id, v_inv.role, 'active', now(), now());
        END IF;

        -- Mark invite accepted
        UPDATE public.organization_invites
        SET status = 'accepted', accepted_at = now(), updated_at = now()
        WHERE id = v_inv.id;

        v_accepted_org_id := v_inv.organization_id;
        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'accepted_count', v_count,
        'organization_id', v_accepted_org_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_organization_invite(TEXT) TO authenticated, service_role;

-- 5. Support default arguments on create_new_organization_owner (1-arg and 3-arg compatible)
DROP FUNCTION IF EXISTS public.create_new_organization_owner(text);
DROP FUNCTION IF EXISTS public.create_new_organization_owner(text, text, text);

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
    v_email TEXT;
    v_name TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Autenticação necessária para criar uma organização.';
    END IF;

    SELECT email, COALESCE(NULLIF(trim(p_user_full_name), ''), raw_user_meta_data->>'full_name', split_part(email, '@', 1))
    INTO v_email, v_name
    FROM auth.users
    WHERE id = v_user_id;

    INSERT INTO public.organizations (name, trade_name, logo_url)
    VALUES (trim(p_org_name), trim(p_org_name), '/logo-garden-gold.jpg')
    RETURNING id INTO v_org_id;

    INSERT INTO public.profiles (id, email, full_name, role, organization_id)
    VALUES (v_user_id, COALESCE(p_user_email, v_email), v_name, 'admin'::public.user_role, v_org_id)
    ON CONFLICT (id) DO UPDATE
    SET organization_id = EXCLUDED.organization_id,
        role = 'admin'::public.user_role,
        full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name);

    INSERT INTO public.organization_members (organization_id, user_id, role, status)
    VALUES (v_org_id, v_user_id, 'owner', 'active')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.surveys (organization_id, title, description, is_active)
    VALUES (
        v_org_id,
        'Pesquisa Oficial de Experiência (NPS)',
        'Avaliação contínua de satisfação dos alunos e clientes.',
        true
    )
    RETURNING id INTO v_survey_id;

    INSERT INTO public.questions (survey_id, question_type, title, is_required, order_index)
    VALUES
        (v_survey_id, 'nps', 'De 0 a 10, qual a probabilidade de você recomendar nossa academia a um amigo ou familiar?', true, 1),
        (v_survey_id, 'text', 'O que motivou sua nota? Deixe seu elogio, crítica ou sugestão de melhoria:', false, 2);

    RETURN v_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_new_organization_owner(TEXT, TEXT, TEXT) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
