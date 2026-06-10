-- =============================================================================
-- GETME / SUPABASE ALL-IN-ONE MIGRATION
-- Fresh install friendly, rerunnable, and aligned with the current app code.
-- =============================================================================

begin;

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1) Shared helpers
-- -----------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.generate_referral_code()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
begin
  loop
    code := 'CE-';
    for i in 1..6 loop
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;

    exit when not exists (
      select 1
      from public.user_profiles
      where referral_code = code
    );
  end loop;

  return code;
end;
$$;

create or replace function public.is_current_user_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return coalesce((
    select true
    from public.user_profiles
    where is_admin = true
      and (id = auth.uid() or user_id = auth.uid())
    limit 1
  ), false);
end;
$$;

-- -----------------------------------------------------------------------------
-- 2) admin_config
-- -----------------------------------------------------------------------------

create table if not exists public.admin_config (
  id int primary key default 1,

  survey_reward int not null default 15,
  captcha_reward int not null default 20,
  ad_reward int not null default 20,
  friend_cut_pct int not null default 10,

  survey_daily_limit int not null default 10,
  captcha_daily_limit int not null default 30,
  ad_daily_limit int not null default 20,

  survey_claim_wait_seconds int not null default 10,
  captcha_claim_wait_seconds int not null default 5,
  ad_view_min_seconds int not null default 5,

  throttle_threshold int not null default 4000,
  throttle_survey_reward int not null default 5,
  throttle_captcha_reward int not null default 5,
  throttle_ad_reward int not null default 5,
  throttle_friend_cut_pct int not null default 2,

  surveys_enabled boolean not null default true,
  captcha_enabled boolean not null default true,
  ads_enabled boolean not null default true,
  referral_enabled boolean not null default true,
  wallet_enabled boolean not null default true,
  leaderboard_enabled boolean not null default true,

  withdraw_phonepe_enabled boolean not null default true,
  withdraw_upi_enabled boolean not null default true,
  withdraw_card_enabled boolean not null default true,
  withdraw_bank_enabled boolean not null default true,
  withdraw_crypto_enabled boolean not null default true,

  withdraw_phonepe_min int not null default 5000,
  withdraw_upi_min int not null default 5000,
  withdraw_card_min int not null default 10000,
  withdraw_bank_min int not null default 10000,
  withdraw_crypto_min int not null default 5000,

  maintenance_mode boolean not null default false,
  maintenance_message text not null default 'We are currently under maintenance. Please check back soon!',

  announcement_enabled boolean not null default false,
  announcement_text text not null default '',
  announcement_type text not null default 'info',

  admin_email text not null default 'admin@getme.app',

  leaderboard_title text not null default 'Top Earners',
  leaderboard_subtitle text not null default 'Compete with other earners worldwide!',
  leaderboard_show_surveys boolean not null default true,
  leaderboard_show_captchas boolean not null default true,
  leaderboard_show_badges boolean not null default true,
  leaderboard_show_podium boolean not null default true,
  leaderboard_show_your_rank boolean not null default true,
  leaderboard_entries text not null default '[]',
  leaderboard_badge_legend int not null default 40000,
  leaderboard_badge_diamond int not null default 20000,
  leaderboard_badge_platinum int not null default 10000,
  leaderboard_badge_gold int not null default 5000,
  leaderboard_badge_silver int not null default 2000,
  leaderboard_mode text not null default 'manual',
  leaderboard_live_limit int not null default 50,
  leaderboard_min_coins int not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_config_announcement_type_check
    check (announcement_type in ('info', 'warning', 'success', 'error')),
  constraint admin_config_leaderboard_mode_check
    check (leaderboard_mode in ('manual', 'live'))
);

alter table public.admin_config add column if not exists survey_reward int not null default 15;
alter table public.admin_config add column if not exists captcha_reward int not null default 20;
alter table public.admin_config add column if not exists ad_reward int not null default 20;
alter table public.admin_config add column if not exists friend_cut_pct int not null default 10;
alter table public.admin_config add column if not exists survey_daily_limit int not null default 10;
alter table public.admin_config add column if not exists captcha_daily_limit int not null default 30;
alter table public.admin_config add column if not exists ad_daily_limit int not null default 20;
alter table public.admin_config add column if not exists survey_claim_wait_seconds int not null default 10;
alter table public.admin_config add column if not exists captcha_claim_wait_seconds int not null default 5;
alter table public.admin_config add column if not exists ad_view_min_seconds int not null default 5;
alter table public.admin_config add column if not exists throttle_threshold int not null default 4000;
alter table public.admin_config add column if not exists throttle_survey_reward int not null default 5;
alter table public.admin_config add column if not exists throttle_captcha_reward int not null default 5;
alter table public.admin_config add column if not exists throttle_ad_reward int not null default 5;
alter table public.admin_config add column if not exists throttle_friend_cut_pct int not null default 2;
alter table public.admin_config add column if not exists surveys_enabled boolean not null default true;
alter table public.admin_config add column if not exists captcha_enabled boolean not null default true;
alter table public.admin_config add column if not exists ads_enabled boolean not null default true;
alter table public.admin_config add column if not exists referral_enabled boolean not null default true;
alter table public.admin_config add column if not exists wallet_enabled boolean not null default true;
alter table public.admin_config add column if not exists leaderboard_enabled boolean not null default true;
alter table public.admin_config add column if not exists withdraw_phonepe_enabled boolean not null default true;
alter table public.admin_config add column if not exists withdraw_upi_enabled boolean not null default true;
alter table public.admin_config add column if not exists withdraw_card_enabled boolean not null default true;
alter table public.admin_config add column if not exists withdraw_bank_enabled boolean not null default true;
alter table public.admin_config add column if not exists withdraw_crypto_enabled boolean not null default true;
alter table public.admin_config add column if not exists withdraw_phonepe_min int not null default 5000;
alter table public.admin_config add column if not exists withdraw_upi_min int not null default 5000;
alter table public.admin_config add column if not exists withdraw_card_min int not null default 10000;
alter table public.admin_config add column if not exists withdraw_bank_min int not null default 10000;
alter table public.admin_config add column if not exists withdraw_crypto_min int not null default 5000;
alter table public.admin_config add column if not exists maintenance_mode boolean not null default false;
alter table public.admin_config add column if not exists maintenance_message text not null default 'We are currently under maintenance. Please check back soon!';
alter table public.admin_config add column if not exists announcement_enabled boolean not null default false;
alter table public.admin_config add column if not exists announcement_text text not null default '';
alter table public.admin_config add column if not exists announcement_type text not null default 'info';
alter table public.admin_config add column if not exists admin_email text not null default 'admin@getme.app';
alter table public.admin_config add column if not exists leaderboard_title text not null default 'Top Earners';
alter table public.admin_config add column if not exists leaderboard_subtitle text not null default 'Compete with other earners worldwide!';
alter table public.admin_config add column if not exists leaderboard_show_surveys boolean not null default true;
alter table public.admin_config add column if not exists leaderboard_show_captchas boolean not null default true;
alter table public.admin_config add column if not exists leaderboard_show_badges boolean not null default true;
alter table public.admin_config add column if not exists leaderboard_show_podium boolean not null default true;
alter table public.admin_config add column if not exists leaderboard_show_your_rank boolean not null default true;
alter table public.admin_config add column if not exists leaderboard_entries text not null default '[]';
alter table public.admin_config add column if not exists leaderboard_badge_legend int not null default 40000;
alter table public.admin_config add column if not exists leaderboard_badge_diamond int not null default 20000;
alter table public.admin_config add column if not exists leaderboard_badge_platinum int not null default 10000;
alter table public.admin_config add column if not exists leaderboard_badge_gold int not null default 5000;
alter table public.admin_config add column if not exists leaderboard_badge_silver int not null default 2000;
alter table public.admin_config add column if not exists leaderboard_mode text not null default 'manual';
alter table public.admin_config add column if not exists leaderboard_live_limit int not null default 50;
alter table public.admin_config add column if not exists leaderboard_min_coins int not null default 0;
alter table public.admin_config add column if not exists created_at timestamptz not null default now();
alter table public.admin_config add column if not exists updated_at timestamptz not null default now();

insert into public.admin_config (id)
values (1)
on conflict (id) do nothing;

update public.admin_config
set
  survey_reward = coalesce(survey_reward, 15),
  captcha_reward = coalesce(captcha_reward, 20),
  ad_reward = coalesce(ad_reward, 20),
  friend_cut_pct = coalesce(friend_cut_pct, 10),
  survey_daily_limit = coalesce(survey_daily_limit, 10),
  captcha_daily_limit = coalesce(captcha_daily_limit, 30),
  ad_daily_limit = coalesce(ad_daily_limit, 20),
  survey_claim_wait_seconds = coalesce(survey_claim_wait_seconds, 10),
  captcha_claim_wait_seconds = coalesce(captcha_claim_wait_seconds, 5),
  ad_view_min_seconds = coalesce(ad_view_min_seconds, 5),
  throttle_threshold = coalesce(throttle_threshold, 4000),
  throttle_survey_reward = coalesce(throttle_survey_reward, 5),
  throttle_captcha_reward = coalesce(throttle_captcha_reward, 5),
  throttle_ad_reward = coalesce(throttle_ad_reward, 5),
  throttle_friend_cut_pct = coalesce(throttle_friend_cut_pct, 2),
  surveys_enabled = coalesce(surveys_enabled, true),
  captcha_enabled = coalesce(captcha_enabled, true),
  ads_enabled = coalesce(ads_enabled, true),
  referral_enabled = coalesce(referral_enabled, true),
  wallet_enabled = coalesce(wallet_enabled, true),
  leaderboard_enabled = coalesce(leaderboard_enabled, true),
  withdraw_phonepe_enabled = coalesce(withdraw_phonepe_enabled, true),
  withdraw_upi_enabled = coalesce(withdraw_upi_enabled, true),
  withdraw_card_enabled = coalesce(withdraw_card_enabled, true),
  withdraw_bank_enabled = coalesce(withdraw_bank_enabled, true),
  withdraw_crypto_enabled = coalesce(withdraw_crypto_enabled, true),
  withdraw_phonepe_min = coalesce(withdraw_phonepe_min, 5000),
  withdraw_upi_min = coalesce(withdraw_upi_min, 5000),
  withdraw_card_min = coalesce(withdraw_card_min, 10000),
  withdraw_bank_min = coalesce(withdraw_bank_min, 10000),
  withdraw_crypto_min = coalesce(withdraw_crypto_min, 5000),
  maintenance_mode = coalesce(maintenance_mode, false),
  maintenance_message = coalesce(maintenance_message, 'We are currently under maintenance. Please check back soon!'),
  announcement_enabled = coalesce(announcement_enabled, false),
  announcement_text = coalesce(announcement_text, ''),
  announcement_type = coalesce(announcement_type, 'info'),
  admin_email = coalesce(admin_email, 'admin@getme.app'),
  leaderboard_title = coalesce(leaderboard_title, 'Top Earners'),
  leaderboard_subtitle = coalesce(leaderboard_subtitle, 'Compete with other earners worldwide!'),
  leaderboard_show_surveys = coalesce(leaderboard_show_surveys, true),
  leaderboard_show_captchas = coalesce(leaderboard_show_captchas, true),
  leaderboard_show_badges = coalesce(leaderboard_show_badges, true),
  leaderboard_show_podium = coalesce(leaderboard_show_podium, true),
  leaderboard_show_your_rank = coalesce(leaderboard_show_your_rank, true),
  leaderboard_entries = coalesce(leaderboard_entries, '[]'),
  leaderboard_badge_legend = coalesce(leaderboard_badge_legend, 40000),
  leaderboard_badge_diamond = coalesce(leaderboard_badge_diamond, 20000),
  leaderboard_badge_platinum = coalesce(leaderboard_badge_platinum, 10000),
  leaderboard_badge_gold = coalesce(leaderboard_badge_gold, 5000),
  leaderboard_badge_silver = coalesce(leaderboard_badge_silver, 2000),
  leaderboard_mode = coalesce(leaderboard_mode, 'manual'),
  leaderboard_live_limit = coalesce(leaderboard_live_limit, 50),
  leaderboard_min_coins = coalesce(leaderboard_min_coins, 0);

drop trigger if exists admin_config_updated_at on public.admin_config;
create trigger admin_config_updated_at
  before update on public.admin_config
  for each row execute function public.touch_updated_at();

alter table public.admin_config enable row level security;

drop policy if exists "admin_config_read_all" on public.admin_config;
create policy "admin_config_read_all"
  on public.admin_config
  for select
  to anon, authenticated
  using (true);

drop policy if exists "admin_config_admin_update" on public.admin_config;
create policy "admin_config_admin_update"
  on public.admin_config
  for update
  to authenticated
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());

grant select on public.admin_config to anon, authenticated;
grant update on public.admin_config to authenticated;

-- -----------------------------------------------------------------------------
-- 3) user_profiles
-- -----------------------------------------------------------------------------

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_id uuid unique references auth.users(id) on delete cascade,
  email text,
  full_name text,

  coins int not null default 0,
  total_earned int not null default 0,
  total_withdrawn int not null default 0,

  surveys_completed int not null default 0,
  captchas_solved int not null default 0,
  ads_watched int not null default 0,

  level int not null default 1,
  xp int not null default 0,
  streak int not null default 0,

  referral_code text unique,
  referred_by uuid references public.user_profiles(id) on delete set null,
  referral_earnings int not null default 0,

  friend_count int not null default 0,
  friends_total_earned int not null default 0,

  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_active timestamptz not null default now()
);

alter table public.user_profiles add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.user_profiles add column if not exists email text;
alter table public.user_profiles add column if not exists full_name text;
alter table public.user_profiles add column if not exists coins int not null default 0;
alter table public.user_profiles add column if not exists total_earned int not null default 0;
alter table public.user_profiles add column if not exists total_withdrawn int not null default 0;
alter table public.user_profiles add column if not exists surveys_completed int not null default 0;
alter table public.user_profiles add column if not exists captchas_solved int not null default 0;
alter table public.user_profiles add column if not exists ads_watched int not null default 0;
alter table public.user_profiles add column if not exists level int not null default 1;
alter table public.user_profiles add column if not exists xp int not null default 0;
alter table public.user_profiles add column if not exists streak int not null default 0;
alter table public.user_profiles add column if not exists referral_code text;
alter table public.user_profiles add column if not exists referred_by uuid references public.user_profiles(id) on delete set null;
alter table public.user_profiles add column if not exists referral_earnings int not null default 0;
alter table public.user_profiles add column if not exists friend_count int not null default 0;
alter table public.user_profiles add column if not exists friends_total_earned int not null default 0;
alter table public.user_profiles add column if not exists is_admin boolean not null default false;
alter table public.user_profiles add column if not exists created_at timestamptz not null default now();
alter table public.user_profiles add column if not exists updated_at timestamptz not null default now();
alter table public.user_profiles add column if not exists last_active timestamptz not null default now();

create unique index if not exists idx_user_profiles_user_id_unique on public.user_profiles (user_id);

create unique index if not exists idx_user_profiles_referral_code_unique
  on public.user_profiles (referral_code)
  where referral_code is not null;

create index if not exists idx_user_profiles_coins_desc on public.user_profiles (coins desc);
create index if not exists idx_user_profiles_total_earned_desc on public.user_profiles (total_earned desc);
create index if not exists idx_user_profiles_referred_by on public.user_profiles (referred_by);

drop trigger if exists user_profiles_updated_at on public.user_profiles;
create trigger user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function public.touch_updated_at();

alter table public.user_profiles enable row level security;

drop policy if exists "user_profiles_read_all" on public.user_profiles;
create policy "user_profiles_read_all"
  on public.user_profiles
  for select
  to authenticated
  using (true);

drop policy if exists "user_profiles_insert_own" on public.user_profiles;
create policy "user_profiles_insert_own"
  on public.user_profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "user_profiles_update_own_or_admin" on public.user_profiles;
create policy "user_profiles_update_own_or_admin"
  on public.user_profiles
  for update
  to authenticated
  using (auth.uid() = id or public.is_current_user_admin())
  with check (auth.uid() = id or public.is_current_user_admin());

grant select, insert, update on public.user_profiles to authenticated;

-- -----------------------------------------------------------------------------
-- 4) referrals
-- -----------------------------------------------------------------------------

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referrer_email text,
  referrer_name text,
  referred_id uuid not null references auth.users(id) on delete cascade,
  referred_email text,
  referred_name text,
  referred_earnings int not null default 0,
  referrer_cut int not null default 0,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_active timestamptz not null default now(),
  constraint referrals_unique_pair unique (referrer_id, referred_id),
  constraint referrals_status_check check (status in ('pending', 'active', 'rewarded'))
);

alter table public.referrals add column if not exists referrer_email text;
alter table public.referrals add column if not exists referrer_name text;
alter table public.referrals add column if not exists referred_email text;
alter table public.referrals add column if not exists referred_name text;
alter table public.referrals add column if not exists referred_earnings int not null default 0;
alter table public.referrals add column if not exists referrer_cut int not null default 0;
alter table public.referrals add column if not exists status text not null default 'pending';
alter table public.referrals add column if not exists created_at timestamptz not null default now();
alter table public.referrals add column if not exists updated_at timestamptz not null default now();
alter table public.referrals add column if not exists last_active timestamptz not null default now();

create index if not exists idx_referrals_referrer_id on public.referrals (referrer_id);
create index if not exists idx_referrals_referred_id on public.referrals (referred_id);
create index if not exists idx_referrals_status on public.referrals (status);

drop trigger if exists referrals_updated_at on public.referrals;
create trigger referrals_updated_at
  before update on public.referrals
  for each row execute function public.touch_updated_at();

alter table public.referrals enable row level security;

drop policy if exists "referrals_read_own_or_admin" on public.referrals;
create policy "referrals_read_own_or_admin"
  on public.referrals
  for select
  to authenticated
  using (auth.uid() = referrer_id or auth.uid() = referred_id or public.is_current_user_admin());

drop policy if exists "referrals_insert_own_or_admin" on public.referrals;
create policy "referrals_insert_own_or_admin"
  on public.referrals
  for insert
  to authenticated
  with check (auth.uid() = referrer_id or auth.uid() = referred_id or public.is_current_user_admin());

drop policy if exists "referrals_update_own_or_admin" on public.referrals;
create policy "referrals_update_own_or_admin"
  on public.referrals
  for update
  to authenticated
  using (auth.uid() = referrer_id or public.is_current_user_admin())
  with check (auth.uid() = referrer_id or public.is_current_user_admin());

grant select, insert, update on public.referrals to authenticated;

-- -----------------------------------------------------------------------------
-- 5) transactions
-- -----------------------------------------------------------------------------

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  source text not null,
  amount int not null,
  method text,
  account_info text,
  status text not null default 'completed',
  created_at timestamptz not null default now(),
  constraint transactions_type_check check (type in ('earn', 'withdraw')),
  constraint transactions_status_check check (status in ('pending', 'completed', 'failed'))
);

alter table public.transactions add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.transactions add column if not exists type text not null;
alter table public.transactions add column if not exists source text not null;
alter table public.transactions add column if not exists amount int not null;
alter table public.transactions add column if not exists method text;
alter table public.transactions add column if not exists account_info text;
alter table public.transactions add column if not exists status text not null default 'completed';
alter table public.transactions add column if not exists created_at timestamptz not null default now();

create index if not exists idx_transactions_user_id on public.transactions (user_id);
create index if not exists idx_transactions_created_at on public.transactions (created_at desc);
create index if not exists idx_transactions_status on public.transactions (status);

alter table public.transactions enable row level security;

drop policy if exists "transactions_read_own_or_admin" on public.transactions;
create policy "transactions_read_own_or_admin"
  on public.transactions
  for select
  to authenticated
  using (auth.uid() = user_id or public.is_current_user_admin());

drop policy if exists "transactions_insert_own" on public.transactions;
create policy "transactions_insert_own"
  on public.transactions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

grant select, insert on public.transactions to authenticated;

-- -----------------------------------------------------------------------------
-- 6) withdrawals
-- -----------------------------------------------------------------------------

create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  method text not null,
  amount_coins int not null,
  amount_inr numeric(10,2) not null,
  account_name text,
  account_number text,
  upi_id text,
  wallet_address text,
  status text not null default 'pending',
  admin_note text,
  processed_by uuid references auth.users(id),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint withdrawals_status_check check (status in ('pending', 'processing', 'completed', 'rejected'))
);

alter table public.withdrawals add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.withdrawals add column if not exists method text not null;
alter table public.withdrawals add column if not exists amount_coins int not null;
alter table public.withdrawals add column if not exists amount_inr numeric(10,2) not null;
alter table public.withdrawals add column if not exists account_name text;
alter table public.withdrawals add column if not exists account_number text;
alter table public.withdrawals add column if not exists upi_id text;
alter table public.withdrawals add column if not exists wallet_address text;
alter table public.withdrawals add column if not exists status text not null default 'pending';
alter table public.withdrawals add column if not exists admin_note text;
alter table public.withdrawals add column if not exists processed_by uuid references auth.users(id);
alter table public.withdrawals add column if not exists processed_at timestamptz;
alter table public.withdrawals add column if not exists created_at timestamptz not null default now();
alter table public.withdrawals add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_withdrawals_user_id on public.withdrawals (user_id);
create index if not exists idx_withdrawals_status on public.withdrawals (status);
create index if not exists idx_withdrawals_created_at on public.withdrawals (created_at desc);

drop trigger if exists withdrawals_updated_at on public.withdrawals;
create trigger withdrawals_updated_at
  before update on public.withdrawals
  for each row execute function public.touch_updated_at();

alter table public.withdrawals enable row level security;

drop policy if exists "withdrawals_read_own_or_admin" on public.withdrawals;
create policy "withdrawals_read_own_or_admin"
  on public.withdrawals
  for select
  to authenticated
  using (auth.uid() = user_id or public.is_current_user_admin());

drop policy if exists "withdrawals_insert_own" on public.withdrawals;
create policy "withdrawals_insert_own"
  on public.withdrawals
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "withdrawals_admin_update" on public.withdrawals;
create policy "withdrawals_admin_update"
  on public.withdrawals
  for update
  to authenticated
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());

grant select, insert, update on public.withdrawals to authenticated;

-- -----------------------------------------------------------------------------
-- 7) Auth / referral functions
-- -----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (
    id,
    user_id,
    email,
    full_name,
    coins,
    total_earned,
    total_withdrawn,
    surveys_completed,
    captchas_solved,
    ads_watched,
    level,
    xp,
    streak,
    referral_code,
    referral_earnings,
    friend_count,
    friends_total_earned,
    is_admin,
    created_at,
    updated_at,
    last_active
  )
  values (
    new.id,
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    public.generate_referral_code(),
    0,
    0,
    0,
    false,
    now(),
    now(),
    now()
  )
  on conflict (id) do update set
    user_id = excluded.user_id,
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.user_profiles.full_name),
    referral_code = coalesce(public.user_profiles.referral_code, excluded.referral_code),
    updated_at = now(),
    last_active = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.apply_referral_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_referrer uuid;
  v_referrer_email text;
  v_referrer_name text;
  v_me_email text;
  v_me_name text;
  v_existing uuid;
begin
  if v_me is null then
    raise exception 'Not authenticated';
  end if;

  select id into v_referrer
  from public.user_profiles
  where upper(referral_code) = upper(trim(p_code))
  limit 1;

  if v_referrer is null then
    raise exception 'Invalid referral code';
  end if;

  if v_referrer = v_me then
    raise exception 'Cannot use your own referral code';
  end if;

  select
    email,
    coalesce(full_name, split_part(email, '@', 1))
  into v_referrer_email, v_referrer_name
  from public.user_profiles
  where id = v_referrer;

  select referred_by into v_existing
  from public.user_profiles
  where id = v_me;

  if v_existing is not null then
    return false;
  end if;

  update public.user_profiles
  set referred_by = v_referrer,
      updated_at = now(),
      last_active = now()
  where id = v_me;

  select
    email,
    coalesce(full_name, split_part(email, '@', 1))
  into v_me_email, v_me_name
  from public.user_profiles
  where id = v_me;

  insert into public.referrals (
    referrer_id,
    referrer_email,
    referrer_name,
    referred_id,
    referred_email,
    referred_name,
    referred_earnings,
    referrer_cut,
    status,
    created_at,
    updated_at,
    last_active
  )
  values (
    v_referrer,
    v_referrer_email,
    v_referrer_name,
    v_me,
    v_me_email,
    v_me_name,
    0,
    0,
    'active',
    now(),
    now(),
    now()
  )
  on conflict (referrer_id, referred_id) do update set
    referrer_email = excluded.referrer_email,
    referrer_name = excluded.referrer_name,
    referred_email = excluded.referred_email,
    referred_name = excluded.referred_name,
    status = excluded.status,
    updated_at = now(),
    last_active = now();

  return true;
end;
$$;

grant execute on function public.apply_referral_code(text) to authenticated;

-- -----------------------------------------------------------------------------
-- 8) Backfill and safety updates
-- -----------------------------------------------------------------------------

insert into public.user_profiles (
  id,
  user_id,
  email,
  full_name,
  referral_code,
  created_at,
  updated_at,
  last_active
)
select
  u.id,
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  public.generate_referral_code(),
  now(),
  now(),
  now()
from auth.users u
left join public.user_profiles p on p.id = u.id
where p.id is null;

update public.admin_config
set
  survey_daily_limit = greatest(1, survey_daily_limit),
  captcha_daily_limit = greatest(1, captcha_daily_limit),
  ad_daily_limit = greatest(1, ad_daily_limit),
  survey_claim_wait_seconds = greatest(1, survey_claim_wait_seconds),
  captcha_claim_wait_seconds = greatest(1, captcha_claim_wait_seconds),
  ad_view_min_seconds = greatest(1, ad_view_min_seconds)
where id = 1;

-- -----------------------------------------------------------------------------
-- 9) Realtime publications
-- -----------------------------------------------------------------------------

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

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'referrals'
  ) then
    alter publication supabase_realtime add table public.referrals;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'transactions'
  ) then
    alter publication supabase_realtime add table public.transactions;
  end if;
end $$;

commit;

-- -----------------------------------------------------------------------------
-- Optional: grant admin access to one account
-- Replace the email below before running if you want to seed an admin user.
-- -----------------------------------------------------------------------------
-- update public.user_profiles
-- set is_admin = true
-- where email = 'your-email@example.com';
