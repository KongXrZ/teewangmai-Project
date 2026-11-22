begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000099a1', 'history-a@example.test', '{"name":"History SQL A"}'),
  ('00000000-0000-0000-0000-0000000099b2', 'history-b@example.test', '{"name":"History SQL B"}'),
  ('00000000-0000-0000-0000-0000000099c3', 'history-c@example.test', '{"name":"History SQL C"}');

do $$
declare
  v_location integer;
  v_floor integer;
  v_a integer;
  v_b integer;
  v_same timestamptz := now() - interval '2 hours';
begin
  select id into v_a from public.users where auth_id = '00000000-0000-0000-0000-0000000099a1';
  select id into v_b from public.users where auth_id = '00000000-0000-0000-0000-0000000099b2';
  insert into public.locations (building, name, category, gps_lat, gps_lng, is_active)
    values ('N999998', 'History test only', '{}', 0, 0, false) returning id into v_location;
  insert into public.floors (location_id, floor_name, qr_code_id, is_active)
    values (v_location, '3', gen_random_uuid()::text, false) returning id into v_floor;
  insert into public.checkins (user_id, floor_id, crowd_level, created_at)
    select v_a, v_floor, (g % 5) + 1, v_same from generate_series(1, 5) g;
  insert into public.checkins (user_id, floor_id, crowd_level, created_at) values
    (v_a, v_floor, 4, now() - interval '1 minute'),
    (v_a, v_floor, 2, now() - interval '40 days'),
    (v_b, v_floor, 5, now());
  perform set_config('test.location', v_location::text, true);
end;
$$;

do $$
begin
  if has_function_privilege('anon', 'public.get_my_checkins(integer, timestamptz, integer)', 'execute') then
    raise exception 'anon can read check-in history';
  end if;
  if pg_get_function_result('public.get_my_checkins(integer, timestamptz, integer)'::regprocedure)
    ~ 'user_id|auth_id|qr_code_id|gps' then
    raise exception 'history exposes identities, QR or GPS';
  end if;
end;
$$;

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-0000000099a1', 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
declare
  v_page record;
  v_seen integer[] := '{}';
  v_cursor_at timestamptz;
  v_cursor_id integer;
  v_pages integer := 0;
  v_rows integer;
begin
  if exists (select 1 from public.checkins) then
    raise exception 'authenticated can read check-ins directly';
  end if;
  if (select matching_count from public.get_my_checkins(1)) <> 7 then
    raise exception 'own count must be 7, got %', (select matching_count from public.get_my_checkins(1));
  end if;

  loop
    v_rows := 0;
    for v_page in
      select * from public.get_my_checkins(2, v_cursor_at, v_cursor_id)
    loop
      if v_page.id = any(v_seen) then
        raise exception 'pagination repeated check-in %', v_page.id;
      end if;
      if v_cursor_at is not null and (v_page.created_at, v_page.id) >= (v_cursor_at, v_cursor_id) then
        raise exception 'pagination is not ordered by created_at desc, id desc';
      end if;
      v_seen := v_seen || v_page.id;
      v_cursor_at := v_page.created_at;
      v_cursor_id := v_page.id;
      v_rows := v_rows + 1;
    end loop;
    exit when v_rows = 0;
    v_pages := v_pages + 1;
    if v_pages > 10 then
      raise exception 'pagination does not terminate';
    end if;
  end loop;
  if cardinality(v_seen) <> 7 then
    raise exception 'pagination skipped rows: saw %', cardinality(v_seen);
  end if;

  select * into v_page from public.get_my_checkins(50) limit 1;
  if v_page.created_at <> (select max(created_at) from public.get_my_checkins(50))
    or v_page.building <> 'N999998' or v_page.floor_name <> '3'
    or v_page.location_id <> current_setting('test.location')::integer then
    raise exception 'first row must be the newest with building and floor: %', row_to_json(v_page);
  end if;
  if not exists (select 1 from public.get_my_checkins(50) where created_at < now() - interval '30 days' and crowd_level = 2) then
    raise exception 'old reports must stay readable with their own crowd level';
  end if;
  if exists (select 1 from public.get_my_checkins(0))
    or exists (select 1 from public.get_my_checkins(52)) then
    raise exception 'limit must be bounded to 1..51';
  end if;
end;
$$;

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-0000000099c3', 'role', 'authenticated')::text, true);

do $$
begin
  if exists (select 1 from public.get_my_checkins(50)) then
    raise exception 'user without reports must get an empty history';
  end if;
end;
$$;

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-00000000ffff', 'role', 'authenticated')::text, true);

do $$
begin
  if exists (select 1 from public.get_my_checkins(50)) then
    raise exception 'unknown user must see nothing';
  end if;
end;
$$;

select 'checkin history rules ok' as result;
rollback;
