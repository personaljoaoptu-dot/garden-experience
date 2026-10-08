-- Migration 15: Add invite_organization_member RPC
-- Allows organization owners/admins to securely link registered users to their organization.

CREATE OR REPLACE FUNCTION public.invite_organization_member(
  p_org_id UUID,
  p_user_email TEXT,
  p_role TEXT DEFAULT 'operator'
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
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Autenticação necessária.');
  END IF;

  -- 1. Check caller permissions
  SELECT role INTO v_caller_role
  FROM public.organization_members
  WHERE user_id = v_caller_id AND organization_id = p_org_id AND status = 'active';

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas Administradores ou Proprietários podem convidar colaboradores.');
  END IF;

  -- 2. Find target user in auth.users
  SELECT id INTO v_target_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(TRIM(p_user_email))
  LIMIT 1;

  IF v_target_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'code', 'USER_NOT_REGISTERED',
      'error', 'E-mail informado não possui uma conta registrada. Solicite ao colaborador que crie sua conta no Garden Experience para aceitar o acesso.'
    );
  END IF;

  -- 3. Check if membership already exists
  SELECT id INTO v_existing_member_id
  FROM public.organization_members
  WHERE organization_id = p_org_id AND user_id = v_target_user_id;

  IF v_existing_member_id IS NOT NULL THEN
    UPDATE public.organization_members
    SET role = p_role, status = 'active', updated_at = NOW()
    WHERE id = v_existing_member_id;

    RETURN jsonb_build_object('success', true, 'message', 'Acesso do colaborador atualizado com sucesso na organização.');
  END IF;

  -- 4. Insert new membership
  INSERT INTO public.organization_members (organization_id, user_id, role, status, created_at, updated_at)
  VALUES (p_org_id, v_target_user_id, p_role, 'active', NOW(), NOW())
  RETURNING id INTO v_member_id;

  RETURN jsonb_build_object('success', true, 'message', 'Colaborador vinculado à organização com sucesso!', 'member_id', v_member_id);
END;
$$;
