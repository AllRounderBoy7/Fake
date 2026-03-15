-- Real referral system helpers for GetMe
-- Run in Supabase SQL Editor

begin;

create extension if not exists pgcrypto;

-- Ensure required columns exist
alter table public.user_profiles add column if not exists referral_code text;
alter table public.user_profiles add column if not exists referred_by uuid references auth.users(id);
alter table public.user_profiles add column if not exists referral_earnings integer default 0;
create unique index if not exists idx_user_profiles_ref_code_unique
  on public.user_profiles(referral_code)
  where referral_code is not null;

-- Ensure referrals table exists
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_id uuid not null references auth.users(id) on delete cascade,
  referred_name text,
  referred_email text,
  status text default 'active',
  referred_earnings integer default 0,
  referrer_cut integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_active timestamptz default now(),
  unique (referrer_id, referred_id)
);

-- Keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_referrals_touch_updated_at on public.referrals;
create trigger trg_referrals_touch_updated_at
before update on public.referrals
for each row execute function public.touch_updated_at();

-- Apply referral code for currently logged-in user
create or replace function public.apply_referral_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_referrer uuid;
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

  select referred_by into v_existing
  from public.user_profiles
  where id = v_me;

  if v_existing is not null then
    return false;
  end if;

  update public.user_profiles
  set referred_by = v_referrer,
      updated_at = now()
  where id = v_me;

  select email, coalesce(full_name, split_part(email, '@', 1))
    into v_me_email, v_me_name
  from public.user_profiles
  where id = v_me;

  insert into public.referrals (
    referrer_id, referred_id, referred_name, referred_email, status
  ) values (
    v_referrer, v_me, v_me_name, v_me_email, 'active'
  )
  on conflict (referrer_id, referred_id) do nothing;

  return true;
end;
$$;

grant execute on function public.apply_referral_code(text) to authenticated;

-- RLS
alter table public.referrals enable row level security;

drop policy if exists "Users can view own referrals" on public.referrals;
create policy "Users can view own referrals"
on public.referrals for select
using (auth.uid() = referrer_id or auth.uid() = referred_id);

drop policy if exists "Users can insert own referral relation" on public.referrals;
create policy "Users can insert own referral relation"
on public.referrals for insert
with check (auth.uid() = referred_id or auth.uid() = referrer_id);

drop policy if exists "Referrer can update own referrals" on public.referrals;
create policy "Referrer can update own referrals"
on public.referrals for update
using (auth.uid() = referrer_id)
with check (auth.uid() = referrer_id);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'referrals'
  ) then
    alter publication supabase_realtime add table public.referrals;
  end if;
end $$;

commit;
