-- Run with psql -v ON_ERROR_STOP=1. Uses catalog assertions and existing profiles;
-- the only inserted records are two throwaway sign-ups. Everything rolls back.
begin;

do $$
declare
  relation_name text;
  column_name text;
begin
  foreach relation_name in array array[
    'users', 'locations', 'floors', 'floor_hours',
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

  if to_regclass('public.location_hours') is not null
    or to_regclass('public.location_profiles') is not null then
    raise exception 'Legacy building hours/profile tables must be removed';
  end if;

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

do $$
declare
  profile record;
begin
  insert into auth.users (id, email, raw_user_meta_data) values
    ('00000000-0000-4000-8000-00000000a7a1', 'blank-meta@example.test',
      '{"name":"   ","avatar_url":"","picture":"javascript:alert(1)"}'),
    ('00000000-0000-4000-8000-00000000a7a2', 'picture-meta@example.test',
      '{"full_name":"Picture User","avatar_url":"not-a-url","picture":"https://example.test/p.png"}');

  select name, avatar_url into profile from public.users
  where auth_id = '00000000-0000-4000-8000-00000000a7a1';
  if not found or profile.name <> 'blank-meta' or profile.avatar_url is not null then
    raise exception 'Sign-up with blank metadata must still create a profile: %', row_to_json(profile);
  end if;

  select name, avatar_url into profile from public.users
  where auth_id = '00000000-0000-4000-8000-00000000a7a2';
  if not found or profile.name <> 'Picture User'
    or profile.avatar_url <> 'https://example.test/p.png' then
    raise exception 'Sign-up must keep the first valid avatar URL: %', row_to_json(profile);
  end if;
end;
$$;

do $$
declare
  long_name text := repeat('ก', 60);
  saved text;
  some_location integer;
begin
  insert into auth.users (id, email, raw_user_meta_data) values
    ('00000000-0000-4000-8000-00000000a7a3', 'long-name@example.test',
      json_build_object('full_name', long_name)::jsonb);
  select name into saved from public.users where auth_id = '00000000-0000-4000-8000-00000000a7a3';
  if saved is null or pg_catalog.char_length(saved) <> 50 then
    raise exception 'Sign-up names must be capped at 50 characters: %', saved;
  end if;

  select id into some_location from public.locations limit 1;
  if some_location is not null then
    begin
      insert into public.floors (location_id, floor_name, qr_code_id)
        values (some_location, 'case-test', 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA');
      raise exception 'Uppercase QR identifiers must be rejected';
    exception when check_violation then null;
    end;
  end if;
  if exists (select 1 from public.floors where qr_code_id <> pg_catalog.lower(qr_code_id)) then
    raise exception 'Every floor QR identifier must be lowercase';
  end if;
end;
$$;

rollback;
