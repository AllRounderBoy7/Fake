-- Ensure user account progress fields exist in user_profiles
-- Run in Supabase SQL Editor

alter table public.user_profiles
add column if not exists friend_count integer default 0;

alter table public.user_profiles
add column if not exists friends_total_earned integer default 0;

alter table public.user_profiles
add column if not exists last_active timestamptz default now();

-- Helpful index for admin/user analytics
create index if not exists idx_user_profiles_total_earned
  on public.user_profiles (total_earned desc);

-- Ensure transactions table exists for persistent earning/withdraw history
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  source text not null,
  amount integer not null,
  status text default 'completed',
  created_at timestamptz default now()
);

alter table public.transactions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'transactions' and policyname = 'Users can view own transactions'
  ) then
    create policy "Users can view own transactions" on public.transactions
      for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'transactions' and policyname = 'Users can insert own transactions'
  ) then
    create policy "Users can insert own transactions" on public.transactions
      for insert with check (auth.uid() = user_id);
  end if;
end $$;

alter publication supabase_realtime add table public.user_profiles;
alter publication supabase_realtime add table public.transactions;
