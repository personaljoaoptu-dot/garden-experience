-- =============================================================================
-- 30_touchpoints_ordering.sql
-- Adds order_index to touchpoints table and backfills initial sequential order
-- =============================================================================

ALTER TABLE public.touchpoints 
  ADD COLUMN IF NOT EXISTS order_index INTEGER NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY created_at ASC) as rnk
  FROM public.touchpoints
)
UPDATE public.touchpoints t
SET order_index = ranked.rnk
FROM ranked
WHERE t.id = ranked.id;
