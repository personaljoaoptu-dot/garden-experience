-- ============================================================================
-- MIGRATION 26: DIRECT EMAIL SENDING CONFIGURATION (WEHELP-STYLE 1-CLICK EMAIL)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.organization_email_config (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  sender_name TEXT,
  sender_email TEXT,
  smtp_host TEXT DEFAULT 'smtp.gmail.com',
  smtp_port INTEGER DEFAULT 465,
  smtp_pass TEXT,
  resend_api_key TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.organization_email_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_members_select_email_config" ON public.organization_email_config;
CREATE POLICY "org_members_select_email_config"
  ON public.organization_email_config
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_email_config.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

DROP POLICY IF EXISTS "org_members_upsert_email_config" ON public.organization_email_config;
CREATE POLICY "org_members_upsert_email_config"
  ON public.organization_email_config
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_email_config.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_email_config.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );
