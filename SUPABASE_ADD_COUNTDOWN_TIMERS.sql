-- Add admin-configurable countdown timer controls
-- Run this in Supabase SQL Editor.

alter table public.admin_config
  add column if not exists survey_claim_wait_seconds integer not null default 10,
  add column if not exists captcha_claim_wait_seconds integer not null default 5,
  add column if not exists ad_view_min_seconds integer not null default 5;

-- Clamp existing bad values, if any
update public.admin_config
set
  survey_claim_wait_seconds = greatest(1, coalesce(survey_claim_wait_seconds, 10)),
  captcha_claim_wait_seconds = greatest(1, coalesce(captcha_claim_wait_seconds, 5)),
  ad_view_min_seconds = greatest(1, coalesce(ad_view_min_seconds, 5))
where id = 1;

-- Ensure singleton row exists
insert into public.admin_config (id)
values (1)
on conflict (id) do nothing;
