-- ====================================================================
-- GARDEN EXPERIENCE — MIGRATION 09: AUTH SECURITY & TENANT ISOLATION HARDENING
-- Strict tenant isolation, RLS enforcement, and elimination of client-side privilege escalation.
-- ====================================================================

-- 1. HARDEN RPC CREATE_NEW_ORGANIZATION_OWNER (SECURITY DEFINER, STRICT AUTH VALIDATION)
CREATE OR REPLACE FUNCTION public.create_new_organization_owner(
    p_org_name TEXT,
    p_user_email TEXT,
    p_user_full_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_org_id UUID;
    v_clean_name TEXT := TRIM(p_org_name);
    v_clean_email TEXT := LOWER(TRIM(p_user_email));
BEGIN
    -- Validar autenticação do chamador
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Acesso negado: Usuário não autenticado.';
    END IF;

    IF v_clean_name IS NULL OR v_clean_name = '' THEN
        RAISE EXCEPTION 'Nome da organização é obrigatório.';
    END IF;

    -- 1. Inserir Organização
    INSERT INTO public.organizations (name, email)
    VALUES (v_clean_name, v_clean_email)
    RETURNING id INTO v_org_id;

    -- 2. Inserir Membership como OWNER
    INSERT INTO public.organization_members (organization_id, user_id, role, status)
    VALUES (v_org_id, v_user_id, 'owner', 'active')
    ON CONFLICT (organization_id, user_id) 
    DO UPDATE SET role = 'owner', status = 'active', updated_at = now();

    -- 3. Atualizar Profile do Usuário
    INSERT INTO public.profiles (id, organization_id, email, full_name, role)
    VALUES (v_user_id, v_org_id, v_clean_email, COALESCE(TRIM(p_user_full_name), v_clean_email), 'owner')
    ON CONFLICT (id)
    DO UPDATE SET organization_id = v_org_id, role = 'owner', full_name = COALESCE(TRIM(p_user_full_name), EXCLUDED.full_name), updated_at = now();

    RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 2. RECRIAR E REFORÇAR POLÍTICAS RLS PARA ISOLAMENTO ESTRITO POR TENANT

-- Enable RLS em todas as tabelas relevantes
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_unit_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

-- Reforçar políticas RLS de follow_up_cases
DROP POLICY IF EXISTS "Members can view cases of their org" ON public.follow_up_cases;
CREATE POLICY "Members can view cases of their org"
ON public.follow_up_cases FOR SELECT
USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "Members can update cases of their org" ON public.follow_up_cases;
CREATE POLICY "Members can update cases of their org"
ON public.follow_up_cases FOR ALL
USING (organization_id = public.get_user_organization_id());

-- Reforçar políticas RLS de communication_logs
DROP POLICY IF EXISTS "Members can view comm logs of their org" ON public.communication_logs;
CREATE POLICY "Members can view comm logs of their org"
ON public.communication_logs FOR SELECT
USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "Members can insert comm logs of their org" ON public.communication_logs;
CREATE POLICY "Members can insert comm logs of their org"
ON public.communication_logs FOR INSERT
WITH CHECK (organization_id = public.get_user_organization_id());

-- 3. TRIGGER DE VALIDAÇÃO DE ALUNO NO MESMO TENANT PARA CASES E LOGS
CREATE OR REPLACE FUNCTION public.validate_cross_tenant_student_reference()
RETURNS TRIGGER AS $$
DECLARE
    v_student_org_id UUID;
BEGIN
    IF NEW.student_id IS NOT NULL THEN
        SELECT organization_id INTO v_student_org_id
        FROM public.students
        WHERE id = NEW.student_id;

        IF v_student_org_id IS NOT NULL AND v_student_org_id <> NEW.organization_id THEN
            RAISE EXCEPTION 'Violação de segurança de Tenant: Aluno pertence a outra organização.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_validate_case_student_tenant ON public.follow_up_cases;
CREATE TRIGGER trg_validate_case_student_tenant
BEFORE INSERT OR UPDATE ON public.follow_up_cases
FOR EACH ROW EXECUTE FUNCTION public.validate_cross_tenant_student_reference();

DROP TRIGGER IF EXISTS trg_validate_comm_log_student_tenant ON public.communication_logs;
CREATE TRIGGER trg_validate_comm_log_student_tenant
BEFORE INSERT OR UPDATE ON public.communication_logs
FOR EACH ROW EXECUTE FUNCTION public.validate_cross_tenant_student_reference();
