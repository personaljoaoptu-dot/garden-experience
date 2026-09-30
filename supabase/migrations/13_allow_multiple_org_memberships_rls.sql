-- Migration 13: Allow users to view any organization they are an active member of
-- Ensures multi-org memberships and newly created organizations render immediately for authenticated users.

CREATE OR REPLACE FUNCTION public.get_user_organization_ids()
RETURNS SETOF UUID AS $$
    SELECT organization_id 
    FROM public.organization_members
    WHERE user_id = auth.uid() AND status = 'active';
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Update RLS policy on public.organizations to allow viewing any active member org
DROP POLICY IF EXISTS "Users can view their organization" ON public.organizations;
CREATE POLICY "Users can view their organization"
ON public.organizations FOR SELECT
USING (
    id IN (
        SELECT organization_id 
        FROM public.organization_members 
        WHERE user_id = auth.uid() AND status = 'active'
    )
);

-- Update RLS policy on public.organizations for updates (owners/admins of that specific org)
DROP POLICY IF EXISTS "Admins can update their organization" ON public.organizations;
CREATE POLICY "Admins can update their organization"
ON public.organizations FOR UPDATE
USING (
    id IN (
        SELECT organization_id 
        FROM public.organization_members 
        WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
    )
);
