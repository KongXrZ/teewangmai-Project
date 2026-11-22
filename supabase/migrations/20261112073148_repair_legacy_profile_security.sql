begin;

set local lock_timeout = '5s';

-- Repair installations that recorded the original auth migration before its
-- trigger/grants were hardened. This also works after a clean baseline replay.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  user_name text;
  user_avatar text;
begin
  user_name := coalesce(
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'full_name',
    pg_catalog.split_part(new.email, '@', 1)
  );
  user_avatar := coalesce(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture'
  );

  insert into public.users (auth_id, name, email, avatar_url, points)
  values (new.id, user_name, new.email, user_avatar, 0)
  on conflict (auth_id) do update set
    name = excluded.name,
    avatar_url = coalesce(excluded.avatar_url, public.users.avatar_url);

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

drop trigger if exists before_update_user_protect_points on public.users;
drop function if exists public.protect_user_points();
drop function if exists public.handle_new_user();

alter table public.users enable row level security;

drop policy if exists "Users can view own profile" on public.users;
create policy "Users can view own profile"
  on public.users for select to authenticated
  using ((select auth.uid()) = auth_id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
  on public.users for update to authenticated
  using ((select auth.uid()) = auth_id)
  with check ((select auth.uid()) = auth_id);

-- Revoke both table-level and explicit column-level legacy privileges.
revoke all on table public.users from public, anon, authenticated;
revoke all (id, auth_id, name, email, avatar_url, points, created_at)
  on table public.users from public, anon, authenticated;
grant select on table public.users to authenticated;
grant update (name, avatar_url) on table public.users to authenticated;

notify pgrst, 'reload schema';

commit;
