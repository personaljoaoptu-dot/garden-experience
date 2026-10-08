-- Migration 14: Fix units RLS policy for multi-organization owners and admins
-- Allows owners/admins of an organization to insert and manage units in all organizations where they hold owner or admin role in organization_members.

DROP POLICY IF EXISTS "Admins can manage units" ON public.units;

CREATE POLICY "Admins can manage units" ON public.units
FOR ALL
TO authenticated
USING (
  get_user_org_role(organization_id) = ANY (ARRAY['owner'::text, 'admin'::text])
)
WITH CHECK (
  get_user_org_role(organization_id) = ANY (ARRAY['owner'::text, 'admin'::text])
);
