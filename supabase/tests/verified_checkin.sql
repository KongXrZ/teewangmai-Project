begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000088a1', 'checkin-a@example.test', '{"name":"Check-in SQL A"}'),
  ('00000000-0000-0000-0000-0000000088b2', 'checkin-b@example.test', '{"name":"Check-in SQL B"}');

do $$
declare
  v_building integer;
  v_closed_building integer;
begin
  insert into public.locations (building, name, category, gps_lat, gps_lng, is_active)
    values ('N999997', 'Check-in test only', '{}', 13.65, 100.49, true) returning id into v_building;
  insert into public.locations (building, name, category, gps_lat, gps_lng, is_active)
    values ('N999996', 'Closed check-in test', '{}', 13.65, 100.49, false) returning id into v_closed_building;
  insert into public.floors (location_id, floor_name, qr_code_id) values
    (v_building, '1', '00000000-0000-4000-8000-0000000c0001'),
    (v_building, '2', '00000000-0000-4000-8000-0000000c0002');
  insert into public.floors (location_id, floor_name, qr_code_id, is_active) values
    (v_building, '3', '00000000-0000-4000-8000-0000000c0003', false);
  insert into public.floors (location_id, floor_name, qr_code_id) values
    (v_closed_building, '1', '00000000-0000-4000-8000-0000000c0004');
end;
$$;

do $$
begin
  if has_function_privilege('anon',
      'public.submit_checkin(text, integer, double precision, double precision, double precision)', 'execute')
    or has_function_privilege('anon', 'public.resolve_floor_qr(text)', 'execute') then
    raise exception 'anon can resolve QR or submit check-ins';
  end if;
end;
$$;

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-00000000ffff', 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
begin
  if (select outcome from public.submit_checkin('00000000-0000-4000-8000-0000000c0001', 3, 13.65, 100.49, 10)) <> 'unauthorized'
    or exists (select 1 from public.resolve_floor_qr('00000000-0000-4000-8000-0000000c0001')) then
    raise exception 'unknown user must be unauthorized';
  end if;
end;
$$;

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-0000000088a1', 'role', 'authenticated')::text, true);

do $$
declare
  v_result record;
  v_floor_one text := '00000000-0000-4000-8000-0000000c0001';
begin
  if exists (select 1 from public.checkins) then
    raise exception 'authenticated can read check-ins directly';
  end if;

  select * into v_result from public.resolve_floor_qr(v_floor_one);
  if v_result.building <> 'N999997' or v_result.floor_name <> '1'
    or exists (select 1 from public.resolve_floor_qr('00000000-0000-4000-8000-0000000c0003'))
    or exists (select 1 from public.resolve_floor_qr('00000000-0000-4000-8000-0000000c0004'))
    or exists (select 1 from public.resolve_floor_qr('00000000-0000-4000-8000-00000000dead')) then
    raise exception 'resolve must return only active floors of active buildings';
  end if;

  if (select outcome from public.submit_checkin(v_floor_one, 6, 13.65, 100.49, 10)) <> 'validation'
    or (select outcome from public.submit_checkin(v_floor_one, 3, 91, 100.49, 10)) <> 'validation'
    or (select outcome from public.submit_checkin(v_floor_one, 3, 13.65, 100.49, 0)) <> 'validation'
    or (select outcome from public.submit_checkin(null, 3, 13.65, 100.49, 10)) <> 'validation' then
    raise exception 'invalid input must be rejected';
  end if;

  if (select outcome from public.submit_checkin('00000000-0000-4000-8000-00000000dead', 3, 13.65, 100.49, 10)) <> 'invalid_qr'
    or (select outcome from public.submit_checkin('00000000-0000-4000-8000-0000000c0003', 3, 13.65, 100.49, 10)) <> 'invalid_qr'
    or (select outcome from public.submit_checkin('00000000-0000-4000-8000-0000000c0004', 3, 13.65, 100.49, 10)) <> 'invalid_qr' then
    raise exception 'unknown QR, inactive floor and inactive building must be invalid';
  end if;

  if (select outcome from public.submit_checkin(v_floor_one, 3, 13.65, 100.49, 101)) <> 'gps_inaccurate' then
    raise exception 'accuracy above 100 m must be rejected';
  end if;

  select * into v_result from public.submit_checkin(v_floor_one, 3, 13.65 + 0.002698, 100.49, 10);
  if v_result.outcome <> 'out_of_range' or v_result.distance_meters not between 295 and 305 then
    raise exception 'a fix 300 m away must be out of range: %', row_to_json(v_result);
  end if;
  if (select outcome from public.submit_checkin(v_floor_one, 3, 13.65 + 0.001259, 100.49, 30)) <> 'out_of_range' then
    raise exception '140 m with 30 m accuracy exceeds 100 + 30 m';
  end if;
  if (select outcome from public.submit_checkin(v_floor_one, 3, -13.65, -79.51, 10)) <> 'out_of_range' then
    raise exception 'antipodal coordinates must be out of range, not an error';
  end if;
  if (select outcome from public.submit_checkin(v_floor_one, 3, 13.65 + 0.001358, 100.49, 100)) <> 'out_of_range' then
    raise exception 'the allowance must stop at 150 m even with poor accuracy';
  end if;

  select * into v_result from public.submit_checkin(v_floor_one, 4, 13.65 + 0.001079, 100.49, 30);
  if v_result.outcome <> 'recorded' or v_result.crowd_level <> 4 or v_result.floor_name <> '1'
    or v_result.building <> 'N999997'
    or v_result.next_eligible_at <> v_result.created_at + interval '30 minutes' then
    raise exception '120 m with 30 m accuracy must be recorded: %', row_to_json(v_result);
  end if;

  select * into v_result from public.submit_checkin(v_floor_one, 2, 13.65, 100.49, 10);
  if v_result.outcome <> 'cooldown' or v_result.next_eligible_at <> now() + interval '30 minutes' then
    raise exception 'same floor within 30 minutes must hit cooldown: %', row_to_json(v_result);
  end if;

  if (select outcome from public.submit_checkin('00000000-0000-4000-8000-0000000c0002', 2, 13.65, 100.49, 10)) <> 'recorded' then
    raise exception 'another floor must have its own cooldown';
  end if;
end;
$$;

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-0000000088b2', 'role', 'authenticated')::text, true);

do $$
begin
  if (select outcome from public.submit_checkin('00000000-0000-4000-8000-0000000c0001', 5, 13.65, 100.49, 10)) <> 'recorded' then
    raise exception 'another user must not share the cooldown';
  end if;
end;
$$;

reset role;

do $$
declare
  v_b integer;
  v_floor_two integer;
begin
  select id into v_b from public.users where auth_id = '00000000-0000-0000-0000-0000000088b2';
  select id into v_floor_two from public.floors where qr_code_id = '00000000-0000-4000-8000-0000000c0002';
  insert into public.checkins (user_id, floor_id, crowd_level, created_at)
    values (v_b, v_floor_two, 3, now() - interval '30 minutes');
  if (select count(*) from public.checkins c join public.users u on u.id = c.user_id
      where u.auth_id in ('00000000-0000-0000-0000-0000000088a1', '00000000-0000-0000-0000-0000000088b2')) <> 4 then
    raise exception 'resolves and rejected submissions must not write check-ins';
  end if;
end;
$$;

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-0000000088b2', 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
begin
  if (select outcome from public.submit_checkin('00000000-0000-4000-8000-0000000c0002', 1, 13.65, 100.49, 10)) <> 'recorded' then
    raise exception 'exactly 30 minutes after the last report must be accepted';
  end if;
end;
$$;

select 'verified check-in rules ok' as result;
rollback;
