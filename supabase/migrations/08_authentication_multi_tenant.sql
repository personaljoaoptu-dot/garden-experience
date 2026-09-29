-- ====================================================================
-- GARDEN EXPERIENCE — MIGRATION 08: AUTHENTICATION & MULTI-TENANT ACCESS CONTROL
-- Enforces real Supabase Auth, organization membership, roles, and RLS policies.
-- ====================================================================

-- 1. TABELA DE MEMBERSHIP DA ORGANIZAÇÃO (organization_members)
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'manager', 'operator', 'viewer')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT organization_members_org_user_unique UNIQUE (organization_id, user_id)
);

-- Garantir índices para buscas de alta performance
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.organization_members(organization_id);

-- Enable RLS na tabela de membership
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 2. FUNÇÕES AUXILIARES SEGURAS (SECURITY DEFINER com search_path = public)
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID AS $$
    SELECT organization_id 
    FROM public.organization_members
    WHERE user_id = auth.uid() AND status = 'active'
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_org_role(_org_id UUID)
RETURNS TEXT AS $$
    SELECT role 
    FROM public.organization_members
    WHERE user_id = auth.uid() AND organization_id = _org_id AND status = 'active'
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

DROP FUNCTION IF EXISTS public.has_unit_access(UUID) CASCADE;
CREATE OR REPLACE FUNCTION public.has_unit_access(_unit_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_unit_org_id UUID;
    v_user_org_id UUID;
    v_role TEXT;
BEGIN
    IF v_user_id IS NULL THEN RETURN FALSE; END IF;

    SELECT organization_id INTO v_unit_org_id FROM public.units WHERE id = _unit_id;
    IF v_unit_org_id IS NULL THEN RETURN FALSE; END IF;

    SELECT organization_id, role INTO v_user_org_id, v_role
    FROM public.organization_members
    WHERE user_id = v_user_id AND organization_id = v_unit_org_id AND status = 'active';

    IF v_user_org_id IS NULL THEN RETURN FALSE; END IF;
    IF v_role IN ('owner', 'admin') THEN RETURN TRUE; END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.user_unit_permissions
        WHERE user_id = v_user_id AND unit_id = _unit_id
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 3. POLÍTICAS RLS NAS TABELAS PRINCIPAIS

-- RLS: organization_members
DROP POLICY IF EXISTS "Members can view members of their organization" ON public.organization_members;
CREATE POLICY "Members can view members of their organization"
ON public.organization_members FOR SELECT
USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "Admins can manage organization members" ON public.organization_members;
CREATE POLICY "Admins can manage organization members"
ON public.organization_members FOR ALL
USING (public.get_user_org_role(organization_id) IN ('owner', 'admin'));

-- RLS: organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their organization" ON public.organizations;
CREATE POLICY "Users can view their organization"
ON public.organizations FOR SELECT
USING (id = public.get_user_organization_id());

DROP POLICY IF EXISTS "Admins can update their organization" ON public.organizations;
CREATE POLICY "Admins can update their organization"
ON public.organizations FOR UPDATE
USING (id = public.get_user_organization_id() AND public.get_user_org_role(id) IN ('owner', 'admin'));

-- RLS: units
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view units of their organization" ON public.units;
CREATE POLICY "Users can view units of their organization"
ON public.units FOR SELECT
USING (organization_id = public.get_user_organization_id() AND public.has_unit_access(id));

DROP POLICY IF EXISTS "Admins can manage units" ON public.units;
CREATE POLICY "Admins can manage units"
ON public.units FOR ALL
USING (organization_id = public.get_user_organization_id() AND public.get_user_org_role(organization_id) IN ('owner', 'admin'));

-- RLS: profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'viewer';

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;
CREATE POLICY "Users can view profiles in their organization"
ON public.profiles FOR SELECT
USING (id = auth.uid() OR organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (id = auth.uid());

-- RLS: responses
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view responses of their org" ON public.responses;
CREATE POLICY "Members can view responses of their org"
ON public.responses FOR SELECT
USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "Allow public responses insertion" ON public.responses;
CREATE POLICY "Allow public responses insertion"
ON public.responses FOR INSERT
WITH CHECK (true);

-- RLS: students
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view students of their org" ON public.students;
CREATE POLICY "Members can view students of their org"
ON public.students FOR SELECT
USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "Members can manage students of their org" ON public.students;
CREATE POLICY "Members can manage students of their org"
ON public.students FOR ALL
USING (organization_id = public.get_user_organization_id());

-- RLS: follow_up_cases
ALTER TABLE public.follow_up_cases ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.follow_up_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view cases of their org" ON public.follow_up_cases;
CREATE POLICY "Members can view cases of their org"
ON public.follow_up_cases FOR SELECT
USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "Members can update cases of their org" ON public.follow_up_cases;
CREATE POLICY "Members can update cases of their org"
ON public.follow_up_cases FOR ALL
USING (organization_id = public.get_user_organization_id());

-- RLS: communication_logs
ALTER TABLE public.communication_logs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view comm logs of their org" ON public.communication_logs;
CREATE POLICY "Members can view comm logs of their org"
ON public.communication_logs FOR SELECT
USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "Members can insert comm logs of their org" ON public.communication_logs;
CREATE POLICY "Members can insert comm logs of their org"
ON public.communication_logs FOR INSERT
WITH CHECK (organization_id = public.get_user_organization_id());

-- 4. RPC PARA CRIAÇÃO DE NOVA ORGANIZAÇÃO COM OWNER AUTOMÁTICO
CREATE OR REPLACE FUNCTION public.create_new_organization_owner(
    p_org_name TEXT,
    p_user_email TEXT,
    p_user_full_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_org_id UUID;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado.';
    END IF;

    -- 1. Criar Organização
    INSERT INTO public.organizations (name, email)
    VALUES (p_org_name, p_user_email)
    RETURNING id INTO v_org_id;

    -- 2. Criar Membership como OWNER
    INSERT INTO public.organization_members (organization_id, user_id, role, status)
    VALUES (v_org_id, v_user_id, 'owner', 'active')
    ON CONFLICT (organization_id, user_id) 
    DO UPDATE SET role = 'owner', status = 'active';

    -- 3. Criar / Atualizar Profile
    INSERT INTO public.profiles (id, organization_id, email, full_name, role)
    VALUES (v_user_id, v_org_id, p_user_email, COALESCE(p_user_full_name, p_user_email), 'owner')
    ON CONFLICT (id)
    DO UPDATE SET organization_id = v_org_id, role = 'owner', full_name = COALESCE(p_user_full_name, EXCLUDED.full_name);

    RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
