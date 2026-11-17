-- Synthetic test records exist only inside this rolled-back transaction.
begin;
do $$
declare
  test_auth uuid := gen_random_uuid();
  test_user integer;
  building_id integer;
  first_floor integer;
  second_floor integer;
  result record;
begin
  insert into auth.users (id, email, raw_user_meta_data)
    values (test_auth, test_auth::text || '@example.test', '{"name":"Crowd SQL test"}');
  select id into test_user from public.users where auth_id = test_auth;
  insert into public.locations (building, name, category, gps_lat, gps_lng)
    values ('N999999', 'Crowd test only', '{}', 0, 0) returning id into building_id;
  insert into public.floors (location_id, floor_name, capacity, qr_code_id)
    values (building_id, '1', 500, gen_random_uuid()::text) returning id into first_floor;
  insert into public.floors (location_id, floor_name, capacity, qr_code_id)
    values (building_id, '2', null, gen_random_uuid()::text) returning id into second_floor;
  insert into public.checkins (user_id, floor_id, crowd_level, created_at)
    select test_user, first_floor, 3, clock_timestamp() - interval '5 minutes' from generate_series(1, 250);
  insert into public.checkins (user_id, floor_id, crowd_level, created_at) values
    (test_user, first_floor, 5, clock_timestamp() - interval '30 minutes'),
    (test_user, first_floor, 5, clock_timestamp() + interval '1 day'),
    (test_user, second_floor, 1, clock_timestamp() - interval '1 minute');
  perform private.refresh_crowd_summaries();
  select * into result from public.get_crowd_summaries(building_id, first_floor);
  if result.report_count <> 250 or result.density_percent <> 50 or result.average_score <> 3 then
    raise exception 'Expected 250 check-ins / 500 capacity = 50%%, average 3; got %', row_to_json(result);
  end if;
  select * into result from public.get_crowd_summaries(building_id, second_floor);
  if result.report_count <> 1 or result.density_percent is not null then
    raise exception 'Missing capacity must not hide count or invent a percentage';
  end if;
  -- Adding a report does not change the published snapshot before refresh.
  insert into public.checkins (user_id, floor_id, crowd_level) values (test_user, first_floor, 5);
  if (select report_count from public.get_crowd_summaries(building_id, first_floor)) <> 250 then
    raise exception 'Snapshot changed before scheduled refresh';
  end if;
  update public.checkins set created_at = clock_timestamp() - interval '31 minutes'
    where floor_id in (first_floor, second_floor);
  perform private.refresh_crowd_summaries();
  select * into result from public.get_crowd_summaries(building_id, first_floor);
  if result.report_count <> 0 or result.average_score is not null or result.density_percent is not null
    or result.latest_report_at is not null then
    raise exception 'Expired reports must clear the snapshot';
  end if;
  if (select count(*) from public.checkins where floor_id = first_floor) <> 253 then
    raise exception 'Refresh deleted historical reports';
  end if;
  update public.floors set is_active = false where id = first_floor;
  if exists (select 1 from public.get_crowd_summaries(building_id, first_floor)) then
    raise exception 'Inactive floor leaked before refresh';
  end if;
  update public.locations set is_active = false where id = building_id;
  if exists (select 1 from public.get_crowd_summaries(building_id)) then
    raise exception 'Inactive building leaked before refresh';
  end if;
  if exists (select 1 from cron.job where jobname = 'refresh-floor-crowd-summaries'
    and (schedule <> '*/10 * * * *' or not active)) then
    raise exception 'Incorrect cron cadence';
  end if;
  if not exists (select 1 from cron.job where jobname = 'refresh-floor-crowd-summaries') then
    raise exception 'Missing cron job';
  end if;
end;
$$;
set local role anon;
select count(*) as publicly_visible_floor_summaries from public.get_crowd_summaries();
reset role;
do $$
declare role_name text;
begin
  foreach role_name in array array['anon', 'authenticated'] loop
    if has_schema_privilege(role_name, 'private', 'usage')
      or has_function_privilege(role_name, 'private.refresh_crowd_summaries()', 'execute')
      or has_table_privilege(role_name, 'private.floor_crowd_summaries', 'select,insert,update,delete') then
      raise exception 'Unexpected private snapshot or refresh access: %', role_name;
    end if;
  end loop;
end;
$$;
rollback;
