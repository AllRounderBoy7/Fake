-- GetMe Admin Panel Full Control Migration
-- Run in Supabase SQL Editor

-- 1) Ensure new leaderboard config columns exist
alter table public.admin_config add column if not exists leaderboard_mode text default 'manual';
alter table public.admin_config add column if not exists leaderboard_live_limit integer default 50;
alter table public.admin_config add column if not exists leaderboard_min_coins integer default 0;

-- 2) Enforce allowed values
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'admin_config_leaderboard_mode_check'
  ) then
    alter table public.admin_config
      add constraint admin_config_leaderboard_mode_check
      check (leaderboard_mode in ('manual', 'live'));
  end if;
end $$;

-- 3) RLS for admin_config
alter table public.admin_config enable row level security;

drop policy if exists "admin_config_select_all" on public.admin_config;
create policy "admin_config_select_all"
on public.admin_config
for select
to authenticated
using (true);

drop policy if exists "admin_config_admin_update" on public.admin_config;
create policy "admin_config_admin_update"
on public.admin_config
for all
to authenticated
using (
  exists (
    select 1
    from public.user_profiles p
    where p.id = auth.uid() and p.is_admin = true
  )
)
with check (
  exists (
    select 1
    from public.user_profiles p
    where p.id = auth.uid() and p.is_admin = true
  )
);

-- 4) Allow authenticated users to read leaderboard source data
alter table public.user_profiles enable row level security;

drop policy if exists "user_profiles_read_for_leaderboard" on public.user_profiles;
create policy "user_profiles_read_for_leaderboard"
on public.user_profiles
for select
to authenticated
using (true);

-- 5) Admin can grant/revoke admin role from panel
drop policy if exists "user_profiles_admin_manage_admin_flag" on public.user_profiles;
create policy "user_profiles_admin_manage_admin_flag"
on public.user_profiles
for update
to authenticated
using (
  exists (
    select 1
    from public.user_profiles p
    where p.id = auth.uid() and p.is_admin = true
  )
)
with check (
  exists (
    select 1
    from public.user_profiles p
    where p.id = auth.uid() and p.is_admin = true
  )
);

-- 6) Seed config row
insert into public.admin_config (id)
values (1)
on conflict (id) do nothing;
