-- Add admin-configurable daily survey limit
ALTER TABLE public.admin_config
ADD COLUMN IF NOT EXISTS survey_daily_limit INTEGER NOT NULL DEFAULT 10;

-- Ensure base row exists
INSERT INTO public.admin_config (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Backfill nulls from older rows (defensive)
UPDATE public.admin_config
SET survey_daily_limit = 10
WHERE survey_daily_limit IS NULL;
