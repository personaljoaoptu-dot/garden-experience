-- Migration 16: Devices (Tablets) & Survey Links RLS Hardening and Safe Deletion RPC

-- 1. Ensure tablets table defaults & RLS
ALTER TABLE public.tablets 
    ALTER COLUMN device_token SET DEFAULT gen_random_uuid()::text;

ALTER TABLE public.tablets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view tablets of their org" ON public.tablets;
DROP POLICY IF EXISTS "Admins can manage tablets" ON public.tablets;

-- SELECT policy for organization members
CREATE POLICY "Users can view tablets of their org"
ON public.tablets FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.units u
    JOIN public.organization_members om ON om.organization_id = u.organization_id
    WHERE u.id = tablets.unit_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
  )
);

-- INSERT / UPDATE / DELETE policy for owners and admins
CREATE POLICY "Admins can manage tablets"
ON public.tablets FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.units u
    WHERE u.id = tablets.unit_id
      AND get_user_org_role(u.organization_id) = ANY(ARRAY['owner', 'admin'])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.units u
    WHERE u.id = tablets.unit_id
      AND get_user_org_role(u.organization_id) = ANY(ARRAY['owner', 'admin'])
  )
);

-- 2. Ensure survey_links RLS
ALTER TABLE public.survey_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active survey links" ON public.survey_links;
DROP POLICY IF EXISTS "Users can view survey links of their org" ON public.survey_links;
DROP POLICY IF EXISTS "Admins can manage survey links" ON public.survey_links;

-- Public can view active links by token
CREATE POLICY "Public can view active survey links"
ON public.survey_links FOR SELECT
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Members can view links for their org
CREATE POLICY "Users can view survey links of their org"
ON public.survey_links FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.units u
    JOIN public.organization_members om ON om.organization_id = u.organization_id
    WHERE u.id = survey_links.unit_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
  )
);

-- Owners and admins can insert/update/delete survey links
CREATE POLICY "Admins can manage survey links"
ON public.survey_links FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.units u
    WHERE u.id = survey_links.unit_id
      AND get_user_org_role(u.organization_id) = ANY(ARRAY['owner', 'admin'])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.units u
    WHERE u.id = survey_links.unit_id
      AND get_user_org_role(u.organization_id) = ANY(ARRAY['owner', 'admin'])
  )
);

-- 3. RPC for safe tablet deletion with dependency check
CREATE OR REPLACE FUNCTION public.delete_tablet(
  p_tablet_id UUID,
  p_org_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_caller_role TEXT;
  v_response_count INT;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Autenticação necessária.');
  END IF;

  SELECT role INTO v_caller_role
  FROM public.organization_members
  WHERE user_id = v_caller_id AND organization_id = p_org_id AND status = 'active';

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas Administradores ou Proprietários podem excluir dispositivos.');
  END IF;

  -- Check if responses exist referencing tablet_id
  SELECT COUNT(*) INTO v_response_count
  FROM public.responses
  WHERE metadata->>'tablet_id' = p_tablet_id::text
     OR metadata->>'device_id' = p_tablet_id::text;

  IF v_response_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'blockedByHistory', true,
      'error', FORMAT('Este dispositivo possui %s resposta(s) vinculada(s) e não pode ser excluído. Desative-o para interromper o uso.', v_response_count)
    );
  END IF;

  DELETE FROM public.tablets WHERE id = p_tablet_id;

  RETURN jsonb_build_object('success', true, 'message', 'Dispositivo excluído com sucesso.');
END;
$$;
