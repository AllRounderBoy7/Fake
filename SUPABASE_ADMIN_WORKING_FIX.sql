-- GetMe Admin Full Working Fix
-- Run this in Supabase SQL Editor.

-- 1) Ensure user_profiles admin flag exists
alter table public.user_profiles
add column if not exists is_admin boolean default false;

-- 2) Ensure admin_config table exists
create table if not exists public.admin_config (
  id int primary key default 1,
  survey_reward int default 15,
  captcha_reward int default 20,
  ad_reward int default 20,
  friend_cut_pct int default 10,
  captcha_daily_limit int default 30,
  ad_daily_limit int default 20,
  throttle_threshold int default 4000,
  throttle_survey_reward int default 5,
  throttle_captcha_reward int default 5,
  throttle_ad_reward int default 5,
  throttle_friend_cut_pct int default 2,
  surveys_enabled boolean default true,
  captcha_enabled boolean default true,
  ads_enabled boolean default true,
  referral_enabled boolean default true,
  wallet_enabled boolean default true,
  leaderboard_enabled boolean default true,
  withdraw_phonepe_enabled boolean default true,
  withdraw_upi_enabled boolean default true,
  withdraw_card_enabled boolean default true,
  withdraw_bank_enabled boolean default true,
  withdraw_crypto_enabled boolean default true,
  withdraw_phonepe_min int default 5000,
  withdraw_upi_min int default 5000,
  withdraw_card_min int default 10000,
  withdraw_bank_min int default 10000,
  withdraw_crypto_min int default 5000,
  maintenance_mode boolean default false,
  maintenance_message text default 'We are currently under maintenance. Please check back soon.',
  announcement_enabled boolean default false,
  announcement_text text default '',
  announcement_type text default 'info',
  admin_email text default 'admin@getme.app',
  leaderboard_title text default 'Top Earners 🏆',
  leaderboard_subtitle text default 'Compete with other earners worldwide!',
  leaderboard_show_surveys boolean default true,
  leaderboard_show_captchas boolean default true,
  leaderboard_show_badges boolean default true,
  leaderboard_show_podium boolean default true,
  leaderboard_show_your_rank boolean default true,
  leaderboard_entries text default '[]',
  leaderboard_badge_legend int default 40000,
  leaderboard_badge_diamond int default 20000,
  leaderboard_badge_platinum int default 10000,
  leaderboard_badge_gold int default 5000,
  leaderboard_badge_silver int default 2000,
  leaderboard_mode text default 'manual',
  leaderboard_live_limit int default 50,
  leaderboard_min_coins int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add any missing columns for projects that already had an older admin_config table
alter table public.admin_config add column if not exists survey_reward int default 15;
alter table public.admin_config add column if not exists captcha_reward int default 20;
alter table public.admin_config add column if not exists ad_reward int default 20;
alter table public.admin_config add column if not exists friend_cut_pct int default 10;
alter table public.admin_config add column if not exists captcha_daily_limit int default 30;
alter table public.admin_config add column if not exists ad_daily_limit int default 20;
alter table public.admin_config add column if not exists throttle_threshold int default 4000;
alter table public.admin_config add column if not exists throttle_survey_reward int default 5;
alter table public.admin_config add column if not exists throttle_captcha_reward int default 5;
alter table public.admin_config add column if not exists throttle_ad_reward int default 5;
alter table public.admin_config add column if not exists throttle_friend_cut_pct int default 2;
alter table public.admin_config add column if not exists surveys_enabled boolean default true;
alter table public.admin_config add column if not exists captcha_enabled boolean default true;
alter table public.admin_config add column if not exists ads_enabled boolean default true;
alter table public.admin_config add column if not exists referral_enabled boolean default true;
alter table public.admin_config add column if not exists wallet_enabled boolean default true;
alter table public.admin_config add column if not exists leaderboard_enabled boolean default true;
alter table public.admin_config add column if not exists withdraw_phonepe_enabled boolean default true;
alter table public.admin_config add column if not exists withdraw_upi_enabled boolean default true;
alter table public.admin_config add column if not exists withdraw_card_enabled boolean default true;
alter table public.admin_config add column if not exists withdraw_bank_enabled boolean default true;
alter table public.admin_config add column if not exists withdraw_crypto_enabled boolean default true;
alter table public.admin_config add column if not exists withdraw_phonepe_min int default 5000;
alter table public.admin_config add column if not exists withdraw_upi_min int default 5000;
alter table public.admin_config add column if not exists withdraw_card_min int default 10000;
alter table public.admin_config add column if not exists withdraw_bank_min int default 10000;
alter table public.admin_config add column if not exists withdraw_crypto_min int default 5000;
alter table public.admin_config add column if not exists maintenance_mode boolean default false;
alter table public.admin_config add column if not exists maintenance_message text default 'We are currently under maintenance. Please check back soon.';
alter table public.admin_config add column if not exists announcement_enabled boolean default false;
alter table public.admin_config add column if not exists announcement_text text default '';
alter table public.admin_config add column if not exists announcement_type text default 'info';
alter table public.admin_config add column if not exists admin_email text default 'admin@getme.app';
alter table public.admin_config add column if not exists leaderboard_title text default 'Top Earners 🏆';
alter table public.admin_config add column if not exists leaderboard_subtitle text default 'Compete with other earners worldwide!';
alter table public.admin_config add column if not exists leaderboard_show_surveys boolean default true;
alter table public.admin_config add column if not exists leaderboard_show_captchas boolean default true;
alter table public.admin_config add column if not exists leaderboard_show_badges boolean default true;
alter table public.admin_config add column if not exists leaderboard_show_podium boolean default true;
alter table public.admin_config add column if not exists leaderboard_show_your_rank boolean default true;
alter table public.admin_config add column if not exists leaderboard_entries text default '[]';
alter table public.admin_config add column if not exists leaderboard_badge_legend int default 40000;
alter table public.admin_config add column if not exists leaderboard_badge_diamond int default 20000;
alter table public.admin_config add column if not exists leaderboard_badge_platinum int default 10000;
alter table public.admin_config add column if not exists leaderboard_badge_gold int default 5000;
alter table public.admin_config add column if not exists leaderboard_badge_silver int default 2000;
alter table public.admin_config add column if not exists leaderboard_mode text default 'manual';
alter table public.admin_config add column if not exists leaderboard_live_limit int default 50;
alter table public.admin_config add column if not exists leaderboard_min_coins int default 0;

alter table public.admin_config drop constraint if exists admin_config_leaderboard_mode_check;
alter table public.admin_config
add constraint admin_config_leaderboard_mode_check
check (leaderboard_mode in ('manual', 'live'));

-- 3) Ensure one config row exists
insert into public.admin_config (id)
values (1)
on conflict (id) do nothing;

-- 4) Helper function for RLS admin checks
create or replace function public.is_current_user_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  has_user_id boolean;
  has_id boolean;
  result_bool boolean := false;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_profiles'
      and column_name = 'user_id'
  ) into has_user_id;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_profiles'
      and column_name = 'id'
  ) into has_id;

  if has_user_id then
    execute 'select coalesce((select is_admin from public.user_profiles where user_id = auth.uid() limit 1), false)'
      into result_bool;
  elsif has_id then
    execute 'select coalesce((select is_admin from public.user_profiles where id = auth.uid() limit 1), false)'
      into result_bool;
  end if;

  return coalesce(result_bool, false);
end;
$$;

grant execute on function public.is_current_user_admin() to authenticated;

-- 5) RLS policies for admin_config
alter table public.admin_config enable row level security;

drop policy if exists "admin_config_select_authenticated" on public.admin_config;
create policy "admin_config_select_authenticated"
on public.admin_config
for select
to authenticated
using (true);

drop policy if exists "admin_config_write_admin_only" on public.admin_config;
create policy "admin_config_write_admin_only"
on public.admin_config
for all
to authenticated
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

-- 6) RLS policies for user_profiles admin toggles
alter table public.user_profiles enable row level security;

drop policy if exists "user_profiles_select_authenticated" on public.user_profiles;
create policy "user_profiles_select_authenticated"
on public.user_profiles
for select
to authenticated
using (true);

drop policy if exists "user_profiles_update_admin_only" on public.user_profiles;
create policy "user_profiles_update_admin_only"
on public.user_profiles
for update
to authenticated
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

-- 7) Grant admin to requested account
update public.user_profiles
set is_admin = true
where email = 'sahanapraveen2006@gmail.com';

-- 8) Realtime (safe add)
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'admin_config'
  ) then
    alter publication supabase_realtime add table public.admin_config;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_profiles'
  ) then
    alter publication supabase_realtime add table public.user_profiles;
  end if;
end $$;
