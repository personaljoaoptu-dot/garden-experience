-- =============================================================================
-- MIGRATION 22: REALTIME PUBLICATION, BRANDING RPC & DEFAULT LOGO
-- =============================================================================

-- 1. Set default Garden Gold Academia logo for existing organizations without a logo
UPDATE public.organizations
SET
  logo_url = COALESCE(logo_url, '/logo-garden-gold.jpg'),
  trade_name = COALESCE(trade_name, name),
  updated_at = NOW()
WHERE logo_url IS NULL;

-- 2. Alter default on organizations.logo_url so new organizations have a fallback logo
ALTER TABLE public.organizations
  ALTER COLUMN logo_url SET DEFAULT '/logo-garden-gold.jpg';

-- 3. Secure RPC for public survey / kiosk to fetch only safe branding fields (name, trade_name, logo_url)
CREATE OR REPLACE FUNCTION public.get_public_organization_branding(p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org RECORD;
BEGIN
  IF p_org_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id, name, trade_name, logo_url
  INTO v_org
  FROM public.organizations
  WHERE id = p_org_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_org.id,
    'name', v_org.name,
    'trade_name', COALESCE(v_org.trade_name, v_org.name),
    'logo_url', COALESCE(v_org.logo_url, '/logo-garden-gold.jpg')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_organization_branding(UUID) TO anon, authenticated;

-- 4. Enable Supabase Realtime on responses, follow_up_cases, and communication_logs
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.responses;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.follow_up_cases;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.communication_logs;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
