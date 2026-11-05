-- =============================================================================
-- 34_admin_set_user_password.sql
-- RPC admin_set_user_password allows users to update their own password
-- or Organization Admins/Owners to reset/define a collaborator's password.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_set_user_password(
    p_target_user_id UUID,
    p_new_password TEXT,
    p_organization_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_role TEXT;
BEGIN
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Autenticação necessária.');
    END IF;

    IF p_new_password IS NULL OR length(p_new_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'error', 'A nova senha deve ter pelo menos 6 caracteres.');
    END IF;

    -- Check caller permissions in organization
    SELECT role INTO v_caller_role
    FROM public.organization_members
    WHERE organization_id = p_organization_id AND user_id = v_caller_id AND status = 'active';

    IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
        -- Allow user to update their own password
        IF v_caller_id != p_target_user_id THEN
            RETURN jsonb_build_object('success', false, 'error', 'Permissão negada. Apenas Administradores podem alterar a senha de outros colaboradores.');
        END IF;
    END IF;

    -- Verify target user belongs to this organization
    IF NOT EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = p_organization_id AND user_id = p_target_user_id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = p_target_user_id AND organization_id = p_organization_id
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Usuário não pertence a esta organização.');
    END IF;

    -- Update target user's encrypted password
    UPDATE auth.users
    SET encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at = now()
    WHERE id = p_target_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'Senha alterada com sucesso.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_password(UUID, TEXT, UUID) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
