-- =====================================================================
-- 25_instant_invite_activation.sql
-- Enables instant password registration & activation for invited collaborators
-- without requiring external SMTP confirmation emails.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 1. Backfill organization_invites for any existing non-owner members so they can also use "Tenho Convite"
INSERT INTO public.organization_invites (organization_id, email, full_name, role, status)
SELECT
    om.organization_id,
    lower(u.email),
    COALESCE(p.full_name, split_part(u.email, '@', 1)),
    om.role,
    'pending'
FROM public.organization_members om
JOIN auth.users u ON u.id = om.user_id
LEFT JOIN public.profiles p ON p.id = om.user_id
WHERE om.role <> 'owner'
  AND NOT EXISTS (
      SELECT 1 FROM public.organization_invites oi
      WHERE oi.organization_id = om.organization_id
        AND lower(oi.email) = lower(u.email)
  );

-- 2. Update invite_organization_member so it ALWAYS generates/refreshes an invite_token
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

    SELECT role INTO v_caller_role
    FROM public.organization_members
    WHERE user_id = v_caller_id AND organization_id = p_org_id AND status = 'active';

    IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Apenas Administradores ou Proprietários podem convidar colaboradores.');
    END IF;

    -- Always create or update an organization_invites record so the user can activate/set password via "Tenho Convite"
    SELECT id, token INTO v_invite_id, v_invite_token
    FROM public.organization_invites
    WHERE organization_id = p_org_id AND lower(email) = v_clean_email
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_invite_id IS NOT NULL THEN
        UPDATE public.organization_invites
        SET role = p_role,
            full_name = COALESCE(v_clean_name, full_name),
            status = 'pending',
            updated_at = now()
        WHERE id = v_invite_id;
    ELSE
        v_invite_token := encode(extensions.gen_random_bytes(16), 'hex');
        INSERT INTO public.organization_invites (
            organization_id, email, full_name, role, token, status, created_by
        ) VALUES (
            p_org_id, v_clean_email, COALESCE(v_clean_name, split_part(v_clean_email, '@', 1)), p_role, v_invite_token, 'pending', v_caller_id
        )
        RETURNING id INTO v_invite_id;
    END IF;

    -- Check if target user already exists in auth.users
    SELECT id INTO v_target_user_id
    FROM auth.users
    WHERE lower(email) = v_clean_email
    LIMIT 1;

    IF v_target_user_id IS NOT NULL THEN
        INSERT INTO public.profiles (id, email, full_name, organization_id, role)
        VALUES (
            v_target_user_id,
            v_clean_email,
            COALESCE(v_clean_name, split_part(v_clean_email, '@', 1)),
            p_org_id,
            CASE WHEN p_role IN ('owner', 'admin') THEN 'admin'::public.user_role ELSE 'unit_manager'::public.user_role END
        )
        ON CONFLICT (id) DO UPDATE
        SET full_name = COALESCE(v_clean_name, NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name);

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

        RETURN jsonb_build_object(
            'success', true,
            'already_registered', true,
            'member_id', v_member_id,
            'invite_token', v_invite_token,
            'message', 'Convite liberado! Envie o link pelo WhatsApp para o colaborador acessar ou criar a senha na aba "Tenho Convite".'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'already_registered', false,
        'invite_id', v_invite_id,
        'invite_token', v_invite_token,
        'message', 'Convite gerado! Envie o link pelo WhatsApp para o colaborador criar sua senha na aba "Tenho Convite".'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.invite_organization_member(UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- 3. Public RPC activate_invited_collaborator:
--    Allows an invited collaborator (matching organization_invites or organization_members)
--    to set their password and confirm their account immediately without waiting for email.
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
            raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('full_name', COALESCE(v_clean_name, split_part(v_clean_email, '@', 1)), 'email_verified', true),
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
            organization_id = COALESCE(v_org_id, public.profiles.organization_id);

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

    -- User does not exist in auth.users yet; client will call supabase.auth.signUp (which auto-confirms)
    RETURN jsonb_build_object(
        'success', true,
        'user_existed', false,
        'organization_id', v_org_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_invited_collaborator(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
