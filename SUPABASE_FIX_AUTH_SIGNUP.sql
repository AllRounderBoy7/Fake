-- =============================================================================
-- GETME / SUPABASE FIX: "Database error saving new user"
-- Run this once in Supabase SQL Editor.
-- Safe for projects where an older schema was already applied.
-- =============================================================================

begin;

-- 1) Ensure helper extension exists.
create extension if not exists pgcrypto;

-- 2) Ensure user_profiles exists.
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  coins integer default 0,
  total_earned integer default 0,
  total_withdrawn integer default 0,
  surveys_completed integer default 0,
  captchas_solved integer default 0,
  ads_watched integer default 0,
  level integer default 1,
  xp integer default 0,
  streak integer default 0,
  referral_code text unique,
  referred_by uuid references auth.users(id),
  referral_earnings integer default 0,
  is_admin boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_active timestamptz default now()
);

-- 3) Compatibility with old schemas that used user_id instead of id.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_profiles'
      and column_name = 'user_id'
  ) then
    alter table public.user_profiles add column if not exists id uuid;
    execute 'update public.user_profiles set id = user_id where id is null';
  end if;
end $$;

-- 4) Ensure all required columns exist (for older partially-created tables).
alter table public.user_profiles add column if not exists email text;
alter table public.user_profiles add column if not exists full_name text;
alter table public.user_profiles add column if not exists coins integer default 0;
alter table public.user_profiles add column if not exists total_earned integer default 0;
alter table public.user_profiles add column if not exists total_withdrawn integer default 0;
alter table public.user_profiles add column if not exists surveys_completed integer default 0;
alter table public.user_profiles add column if not exists captchas_solved integer default 0;
alter table public.user_profiles add column if not exists ads_watched integer default 0;
alter table public.user_profiles add column if not exists level integer default 1;
alter table public.user_profiles add column if not exists xp integer default 0;
alter table public.user_profiles add column if not exists streak integer default 0;
alter table public.user_profiles add column if not exists referral_code text;
alter table public.user_profiles add column if not exists referred_by uuid references auth.users(id);
alter table public.user_profiles add column if not exists referral_earnings integer default 0;
alter table public.user_profiles add column if not exists is_admin boolean default false;
alter table public.user_profiles add column if not exists created_at timestamptz default now();
alter table public.user_profiles add column if not exists updated_at timestamptz default now();
alter table public.user_profiles add column if not exists last_active timestamptz default now();

-- 5) Ensure id is the PK.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.user_profiles'::regclass
      and contype = 'p'
  ) then
    alter table public.user_profiles add primary key (id);
  end if;
end $$;

-- 6) Ensure unique referral_code index/constraint.
create unique index if not exists idx_user_profiles_referral_code_unique
  on public.user_profiles (referral_code)
  where referral_code is not null;

-- 7) Referral code generator.
create or replace function public.generate_referral_code()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text := 'GM-';
  i int;
begin
  loop
    candidate := 'GM-';
    for i in 1..6 loop
      candidate := candidate || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;

    exit when not exists (
      select 1 from public.user_profiles where referral_code = candidate
    );
  end loop;

  return candidate;
end;
$$;

-- 8) Robust signup trigger function (upsert, never fails on existing row).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (
    id,
    email,
    full_name,
    referral_code,
    created_at,
    updated_at,
    last_active
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    public.generate_referral_code(),
    now(),
    now(),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.user_profiles.full_name),
    updated_at = now(),
    last_active = now();

  return new;
end;
$$;

-- 9) Recreate auth trigger cleanly.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 10) Backfill missing profiles for already-created auth users.
insert into public.user_profiles (id, email, full_name, referral_code, created_at, updated_at, last_active)
select
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

-- 11) RLS + safe policies.
alter table public.user_profiles enable row level security;

drop policy if exists "Users can view own profile" on public.user_profiles;
drop policy if exists "Users can update own profile" on public.user_profiles;
drop policy if exists "Users can insert own profile" on public.user_profiles;

create policy "Users can view own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.user_profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can insert own profile"
  on public.user_profiles for insert
  with check (auth.uid() = id);

commit;

-- Quick verify:
-- select id, email, full_name, referral_code from public.user_profiles order by created_at desc limit 20;
