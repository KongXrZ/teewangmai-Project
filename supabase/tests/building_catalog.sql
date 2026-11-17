-- Uses existing approved reference records; changes roll back. No fixture rows.
begin;
select set_config('test.active_buildings', (select count(*)::text from public.locations where is_active), true);
select set_config('test.active_floors', (select count(*)::text from public.floors f
  join public.locations l on l.id = f.location_id where f.is_active and l.is_active), true);

do $$
declare role_name text;
begin
  if (select prosecdef from pg_proc where oid = 'public.search_locations(text,text)'::regprocedure) then
    raise exception 'Catalog search must not bypass RLS';
  end if;
  foreach role_name in array array['anon', 'authenticated'] loop
    if has_column_privilege(role_name, 'public.floors', 'qr_code_id', 'SELECT') then
      raise exception 'Catalog reader can access QR identifiers';
    end if;
    if has_table_privilege(role_name, 'public.locations', 'INSERT,UPDATE,DELETE')
      or has_table_privilege(role_name, 'public.floors', 'INSERT,UPDATE,DELETE')
      or has_table_privilege(role_name, 'public.floor_hours', 'INSERT,UPDATE,DELETE') then
      raise exception 'Catalog reader has write grants';
    end if;
    execute format('set local role %I', role_name);
    if (select count(*) from public.search_locations()) <> current_setting('test.active_buildings')::int
      or (select count(id) from public.floors) <> current_setting('test.active_floors')::int
      or exists (select 1 from public.locations where not is_active) then
      raise exception 'Active reference visibility is incorrect';
    end if;
    if exists (select 1 from public.search_locations('%_,(')) then
      raise exception 'Search punctuation must be literal';
    end if;
    reset role;
  end loop;
end;
$$;

-- Hide one real floor and its schedules; then hide its building and all children.
select set_config('test.floor_id', (select f.id::text from public.floors f
  join public.locations l on l.id = f.location_id where f.is_active and l.is_active order by f.id limit 1), true);
select set_config('test.location_id', (select location_id::text from public.floors
  where id = current_setting('test.floor_id')::int), true);
update public.floors set is_active = false where id = current_setting('test.floor_id')::int;
set local role anon;
do $$ begin
  if exists (select 1 from public.floors where id = current_setting('test.floor_id')::int)
    or exists (select 1 from public.floor_hours where floor_id = current_setting('test.floor_id')::int) then
    raise exception 'Inactive floor or its schedules leaked';
  end if;
end $$;
reset role;
update public.locations set is_active = false where id = current_setting('test.location_id')::int;
set local role authenticated;
do $$ begin
  if exists (select 1 from public.search_locations() where id = current_setting('test.location_id')::int)
    or exists (select 1 from public.floors where location_id = current_setting('test.location_id')::int) then
    raise exception 'Inactive building or its floors leaked';
  end if;
end $$;
reset role;
rollback;
