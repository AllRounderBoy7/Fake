-- Give admin access to an existing user account
-- Target: sahanapraveen2006@gmail.com

begin;

-- 1) Ensure the profile row exists (supports schema with user_id or id)
insert into public.user_profiles (user_id, email, full_name, is_admin)
select
  au.id,
  au.email,
  coalesce(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  true
from auth.users au
where au.email = 'sahanapraveen2006@gmail.com'
on conflict (user_id) do update
set is_admin = true,
    email = excluded.email,
    full_name = excluded.full_name,
    updated_at = now();

-- 2) Backward-compat fallback for older schema keyed by id
update public.user_profiles up
set is_admin = true,
    updated_at = now()
from auth.users au
where au.email = 'sahanapraveen2006@gmail.com'
  and up.id = au.id;

-- 3) (Optional) set account password to: sameer3745
-- NOTE: Run only if you want to force-reset password by SQL.
-- Requires pgcrypto (usually available in Supabase SQL editor).
create extension if not exists pgcrypto;
update auth.users
set encrypted_password = crypt('sameer3745', gen_salt('bf'))
where email = 'sahanapraveen2006@gmail.com';

commit;

-- Verify
select
  au.email,
  coalesce(up.is_admin, false) as is_admin
from auth.users au
left join public.user_profiles up
  on up.user_id = au.id or up.id = au.id
where au.email = 'sahanapraveen2006@gmail.com';
