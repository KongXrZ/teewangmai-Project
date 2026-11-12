-- Run with psql -v ON_ERROR_STOP=1. Uses catalog assertions and existing profiles;
-- no synthetic application records are inserted. Any profile update rolls back.
begin;

do $$
declare
  relation_name text;
  column_name text;
begin
  foreach relation_name in array array[
    'users', 'locations', 'floors', 'location_hours', 'location_profiles',
    'checkins', 'badges', 'user_badges', 'rewards', 'redemptions'
  ] loop
    if not exists (
      select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = relation_name
        and c.relkind = 'r' and c.relrowsecurity
    ) then
      raise exception 'Missing table or RLS: %', relation_name;
    end if;
  end loop;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and (
      (table_name = 'locations' and information_schema.columns.column_name in ('floor', 'qr_code_id'))
      or (table_name = 'checkins' and information_schema.columns.column_name = 'location_id')
      or (table_name = 'floors' and information_schema.columns.column_name = 'current_crowd_level')
    )
  ) then
    raise exception 'Legacy references or a duplicated crowd summary remain';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'checkins'
      and information_schema.columns.column_name = 'floor_id' and is_nullable = 'NO'
  ) then
    raise exception 'checkins.floor_id must be required';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.checkins'::regclass and contype = 'f'
      and confrelid = 'public.floors'::regclass and convalidated and confdeltype = 'r'
  ) or not exists (
    select 1 from pg_constraint
    where conrelid = 'public.floors'::regclass and contype = 'f'
      and confrelid = 'public.locations'::regclass and convalidated and confdeltype = 'r'
  ) then
    raise exception 'Building/floor/check-in foreign keys must be valid and restrict deletion';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.floors'::regclass and contype = 'u'
      and pg_get_constraintdef(oid) = 'UNIQUE (location_id, floor_name)'
  ) or not exists (
    select 1 from pg_constraint
    where conrelid = 'public.floors'::regclass and contype = 'u'
      and pg_get_constraintdef(oid) = 'UNIQUE (qr_code_id)'
  ) then
    raise exception 'Floor labels and QR identifiers need their uniqueness constraints';
  end if;

  if not exists (
    select 1 from pg_indexes where schemaname = 'public'
      and tablename = 'checkins' and indexdef like '%(floor_id, created_at DESC)%'
  ) or not exists (
    select 1 from pg_indexes where schemaname = 'public'
      and tablename = 'checkins' and indexdef like '%(user_id, floor_id, created_at DESC)%'
  ) then
    raise exception 'Summary/cooldown lookup indexes are missing';
  end if;

  if to_regprocedure('public.handle_new_user()') is not null
    or to_regprocedure('public.protect_user_points()') is not null then
    raise exception 'Legacy public trigger functions must be removed';
  end if;

  if not exists (
    select 1 from pg_proc where oid = 'private.handle_new_user()'::regprocedure
      and prosecdef and proconfig @> array['search_path=""']
  ) or not exists (
    select 1 from pg_trigger
    where tgrelid = 'auth.users'::regclass and tgname = 'on_auth_user_created'
      and tgfoid = 'private.handle_new_user()'::regprocedure
  ) then
    raise exception 'Auth profile trigger must use the private function with an empty search path';
  end if;

  foreach relation_name in array array['anon', 'authenticated'] loop
    if has_schema_privilege(relation_name, 'private', 'USAGE')
      or has_function_privilege(relation_name, 'private.handle_new_user()', 'EXECUTE')
      or has_table_privilege(relation_name, 'public.floors', 'INSERT')
      or has_table_privilege(relation_name, 'public.users', 'INSERT')
      or has_table_privilege(relation_name, 'public.users', 'DELETE') then
      raise exception 'Unexpected client privilege for %', relation_name;
    end if;
    foreach column_name in array array['id', 'auth_id', 'email', 'points', 'created_at'] loop
      if has_column_privilege(relation_name, 'public.users', column_name, 'UPDATE') then
        raise exception 'Client role % can change protected column %', relation_name, column_name;
      end if;
    end loop;
  end loop;

  if not has_table_privilege('authenticated', 'public.users', 'SELECT')
    or not has_column_privilege('authenticated', 'public.users', 'name', 'UPDATE')
    or not has_column_privilege('authenticated', 'public.users', 'avatar_url', 'UPDATE')
    or has_table_privilege('anon', 'public.users', 'SELECT') then
    raise exception 'Profile grants do not match the own-profile contract';
  end if;
end;
$$;

-- Exercise RLS against an existing profile without creating an account or fixture.
do $$
declare
  existing_auth_id uuid;
  matched integer;
begin
  select auth_id into existing_auth_id from public.users order by id limit 1;
  if existing_auth_id is null then
    raise notice 'No existing profile: catalog assertions passed; own-profile behavior requires a real account';
    return;
  end if;

  perform set_config('request.jwt.claim.sub', existing_auth_id::text, true);
  set local role authenticated;
  select count(*) into matched from public.users;
  if matched <> 1 then
    raise exception 'A user must see exactly their own profile';
  end if;
  update public.users set name = name where auth_id = existing_auth_id;
  get diagnostics matched = row_count;
  if matched <> 1 then
    raise exception 'Own-profile name updates must remain available';
  end if;
  begin
    update public.users set points = points where auth_id = existing_auth_id;
    raise exception 'Protected points update unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000000', true);
  select count(*) into matched from public.users;
  if matched <> 0 then
    raise exception 'A different identity must not see the existing profile';
  end if;
  reset role;
end;
$$;

rollback;
