-- =============================================================================
-- 33_fix_collaborator_invite_isolation.sql
-- Fixes invite consumption so an authenticated user cannot consume an invite
-- addressed to another email address, and ensures invited users who were
-- already confirmed get immediately linked to organization_members & profiles.
-- =============================================================================

-- 1. accept_organization_invite: enforce matching email or pending invite
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

    IF v_user_email IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'E-mail do usuário não encontrado.');
    END IF;

    -- Match invites belonging to THIS authenticated user
    -- (Either matching token AND email, OR matching email directly)
    FOR v_inv IN
        SELECT *
        FROM public.organization_invites
        WHERE lower(email) = lower(v_user_email)
          AND (
              status = 'pending'
              OR NOT EXISTS (
                  SELECT 1 FROM public.organization_members
                  WHERE organization_id = public.organization_invites.organization_id
                    AND user_id = v_user_id
              )
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

-- 2. activate_invited_collaborator: robust password assignment and instant activation
CREATE OR REPLACE FUNCTION public.activate_invited_collaborator(
    p_email TEXT,
    p_password TEXT,
    p_full_name TEXT DEFAULT NULL,
    p_invite_token TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_clean_email TEXT := lower(trim(COALESCE(p_email, '')));
    v_clean_name TEXT := NULLIF(trim(COALESCE(p_full_name, '')), '');
    v_inv RECORD;
    v_mem RECORD;
    v_user_id UUID;
    v_org_id UUID := NULL;
    v_role TEXT := 'operator';
BEGIN
    IF v_clean_email = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Informe o e-mail convidado.');
    END IF;

    IF p_password IS NULL OR length(p_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'error', 'A senha deve ter pelo menos 6 caracteres.');
    END IF;

    -- 1. Check if there is an invite for this token or email
    SELECT * INTO v_inv
    FROM public.organization_invites
    WHERE (
        (p_invite_token IS NOT NULL AND trim(p_invite_token) <> '' AND token = trim(p_invite_token))
        OR lower(email) = v_clean_email
    )
    ORDER BY (CASE WHEN status = 'pending' THEN 0 ELSE 1 END), created_at DESC
    LIMIT 1;

    IF v_inv IS NOT NULL THEN
        v_org_id := v_inv.organization_id;
        v_role := COALESCE(v_inv.role, 'operator');
        v_clean_name := COALESCE(v_clean_name, v_inv.full_name, split_part(v_clean_email, '@', 1));
    ELSE
        -- Fallback: check if user is already in organization_members
        SELECT om.organization_id, om.role, u.id AS uid
        INTO v_mem
        FROM auth.users u
        JOIN public.organization_members om ON om.user_id = u.id
        WHERE lower(u.email) = v_clean_email
        ORDER BY om.created_at DESC
        LIMIT 1;

        IF v_mem IS NOT NULL THEN
            v_org_id := v_mem.organization_id;
            v_role := v_mem.role;
        ELSE
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Nenhum convite encontrado para este e-mail. Solicite ao administrador que envie o convite em Configurações -> Usuários.'
            );
        END IF;
    END IF;

    -- 2. Check if user already exists in auth.users
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE lower(email) = v_clean_email
    LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        -- Update password & auto-confirm email immediately so they can log in without email confirmation
        UPDATE auth.users
        SET encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
                'full_name', COALESCE(v_clean_name, split_part(v_clean_email, '@', 1)),
                'email_verified', true
            ),
            updated_at = now()
        WHERE id = v_user_id;

        -- Ensure profile exists
        INSERT INTO public.profiles (id, email, full_name, organization_id, role)
        VALUES (
            v_user_id,
            v_clean_email,
            COALESCE(v_clean_name, split_part(v_clean_email, '@', 1)),
            v_org_id,
            CASE WHEN v_role IN ('owner', 'admin') THEN 'admin'::public.user_role ELSE 'unit_manager'::public.user_role END
        )
        ON CONFLICT (id) DO UPDATE
        SET full_name = COALESCE(v_clean_name, NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
            organization_id = COALESCE(v_org_id, public.profiles.organization_id),
            role = CASE WHEN v_role IN ('owner', 'admin') THEN 'admin'::public.user_role ELSE 'unit_manager'::public.user_role END;

        -- Ensure organization_members row is active
        IF EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = v_org_id AND user_id = v_user_id
        ) THEN
            UPDATE public.organization_members
            SET role = v_role, status = 'active', updated_at = now()
            WHERE organization_id = v_org_id AND user_id = v_user_id;
        ELSE
            INSERT INTO public.organization_members (organization_id, user_id, role, status, created_at, updated_at)
            VALUES (v_org_id, v_user_id, v_role, 'active', now(), now());
        END IF;

        -- Mark invite accepted
        IF v_inv IS NOT NULL THEN
            UPDATE public.organization_invites
            SET status = 'accepted', accepted_at = now(), updated_at = now()
            WHERE id = v_inv.id;
        END IF;

        RETURN jsonb_build_object(
            'success', true,
            'user_existed', true,
            'organization_id', v_org_id
        );
    END IF;

    -- User does not exist in auth.users yet; client will call supabase.auth.signUp
    RETURN jsonb_build_object(
        'success', true,
        'user_existed', false,
        'organization_id', v_org_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_invited_collaborator(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
