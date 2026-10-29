-- =============================================================================
-- 31_update_member_name.sql
-- RPC update_member_name with SECURITY DEFINER and RLS policies on profiles
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_member_name(
    p_user_id UUID,
    p_new_name TEXT,
    p_organization_id UUID DEFAULT NULL,
    p_is_pending BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clean_name TEXT;
    v_caller_id UUID := auth.uid();
    v_caller_role TEXT;
BEGIN
    v_clean_name := TRIM(p_new_name);
    IF v_clean_name IS NULL OR v_clean_name = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Nome não pode ser vazio.');
    END IF;

    -- If target is a pending invite in organization_invites
    IF p_is_pending THEN
        UPDATE public.organization_invites
        SET full_name = v_clean_name, updated_at = NOW()
        WHERE id = p_user_id AND (p_organization_id IS NULL OR organization_id = p_organization_id);

        RETURN jsonb_build_object('success', true, 'name', v_clean_name);
    END IF;

    -- Check permission if caller is updating another user
    IF v_caller_id IS NOT NULL AND v_caller_id != p_user_id AND p_organization_id IS NOT NULL THEN
        SELECT role INTO v_caller_role
        FROM public.organization_members
        WHERE organization_id = p_organization_id AND user_id = v_caller_id;

        IF v_caller_role NOT IN ('owner', 'admin') THEN
            RETURN jsonb_build_object('success', false, 'error', 'Permissão negada. Apenas Administradores podem alterar o nome de outros colaboradores.');
        END IF;
    END IF;

    -- Update profiles
    UPDATE public.profiles
    SET full_name = v_clean_name
    WHERE id = p_user_id;

    -- Update auth.users metadata if accessible
    BEGIN
        UPDATE auth.users
        SET raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{full_name}', to_jsonb(v_clean_name))
        WHERE id = p_user_id;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN jsonb_build_object('success', true, 'name', v_clean_name);
END;
$$;
