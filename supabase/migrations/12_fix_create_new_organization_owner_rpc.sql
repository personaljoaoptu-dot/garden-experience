-- Migration 12: Fix create_new_organization_owner RPC schema alignment
-- Corrects INSERT INTO public.organizations to use only existing columns (name), sets profiles.role to 'admin'::user_role, and binds owner via auth.uid() or auth.users lookup.

CREATE OR REPLACE FUNCTION public.create_new_organization_owner(
    p_org_name text,
    p_user_email text DEFAULT NULL::text,
    p_user_full_name text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_org_id UUID;
    v_clean_name TEXT := TRIM(p_org_name);
    v_clean_email TEXT;
BEGIN
    -- 1. Resolver e-mail
    IF p_user_email IS NOT NULL AND TRIM(p_user_email) <> '' THEN
        v_clean_email := LOWER(TRIM(p_user_email));
    END IF;

    -- Se auth.uid() for nulo, resolver v_user_id pelo e-mail em auth.users
    IF v_user_id IS NULL AND v_clean_email IS NOT NULL THEN
        SELECT id INTO v_user_id FROM auth.users WHERE email = v_clean_email LIMIT 1;
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

    -- 2. Inserir Organização (usando somente colunas existentes: name)
    INSERT INTO public.organizations (name)
    VALUES (v_clean_name)
    RETURNING id INTO v_org_id;

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
        COALESCE(TRIM(p_user_full_name), v_clean_email), 
        'admin'::user_role
    )
    ON CONFLICT (id)
    DO UPDATE SET 
        organization_id = v_org_id, 
        role = 'admin'::user_role, 
        full_name = COALESCE(TRIM(p_user_full_name), profiles.full_name);

    RETURN v_org_id;
END;
$function$;
