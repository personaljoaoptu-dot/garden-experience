-- ====================================================================
-- GARDEN EXPERIENCE V1.4 — MIGRATION 19: TOUCHPOINTS RLS HARDENING
-- ====================================================================

-- 1. Certificar RLS ativado nas tabelas
ALTER TABLE public.touchpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_touchpoints ENABLE ROW LEVEL SECURITY;

-- 2. Limpar políticas antigas se existirem
DROP POLICY IF EXISTS "Leitura pública de touchpoints ativos" ON public.touchpoints;
DROP POLICY IF EXISTS "Gestores e Admins leem todos os touchpoints" ON public.touchpoints;
DROP POLICY IF EXISTS "Administradores gerenciam touchpoints" ON public.touchpoints;
DROP POLICY IF EXISTS "Members view org touchpoints" ON public.touchpoints;
DROP POLICY IF EXISTS "Members manage org touchpoints" ON public.touchpoints;

DROP POLICY IF EXISTS "Members view unit touchpoints" ON public.unit_touchpoints;
DROP POLICY IF EXISTS "Members manage unit touchpoints" ON public.unit_touchpoints;

-- 3. Políticas Multi-Tenant para public.touchpoints
CREATE POLICY "Members view org touchpoints"
ON public.touchpoints FOR SELECT
USING (
  is_active = true OR
  organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "Members manage org touchpoints"
ON public.touchpoints FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- 4. Políticas Multi-Tenant para public.unit_touchpoints
CREATE POLICY "Members view unit touchpoints"
ON public.unit_touchpoints FOR SELECT
USING (
  unit_id IN (
    SELECT u.id FROM public.units u
    JOIN public.organization_members om ON om.organization_id = u.organization_id
    WHERE om.user_id = auth.uid() AND om.status = 'active'
  )
);

CREATE POLICY "Members manage unit touchpoints"
ON public.unit_touchpoints FOR ALL
USING (
  unit_id IN (
    SELECT u.id FROM public.units u
    JOIN public.organization_members om ON om.organization_id = u.organization_id
    WHERE om.user_id = auth.uid() AND om.status = 'active'
  )
)
WITH CHECK (
  unit_id IN (
    SELECT u.id FROM public.units u
    JOIN public.organization_members om ON om.organization_id = u.organization_id
    WHERE om.user_id = auth.uid() AND om.status = 'active'
  )
);
