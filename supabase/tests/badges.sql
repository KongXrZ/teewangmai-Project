begin;
do $$
declare
  auth_a uuid := gen_random_uuid();
  auth_b uuid := gen_random_uuid();
  user_a integer;
  user_b integer;
  building_one integer;
  floor_one integer;
  floor_other integer;
  count_badge integer;
  inactive_badge integer;
  third_checkin_at timestamptz;
begin
  insert into auth.users (id, email, raw_user_meta_data) values
    (auth_a, auth_a::text || '@example.test', '{"name":"Badge SQL A"}'),
    (auth_b, auth_b::text || '@example.test', '{"name":"Badge SQL B"}');
  select id into user_a from public.users where auth_id = auth_a;
  select id into user_b from public.users where auth_id = auth_b;
  perform set_config('badge_test.auth_a', auth_a::text, true);
  perform set_config('badge_test.auth_b', auth_b::text, true);

  insert into public.locations (building, name, category, gps_lat, gps_lng)
    values ('N999991', 'Badge test only', '{}', 0, 0) returning id into building_one;
  insert into public.floors (location_id, floor_name, qr_code_id)
    values (building_one, '1', gen_random_uuid()::text) returning id into floor_one;
  insert into public.floors (location_id, floor_name, qr_code_id)
    values (building_one, '2', gen_random_uuid()::text) returning id into floor_other;

  begin
    insert into public.badges (name, requirement_type, requirement_value) values ('x', 'points_total', 1);
    raise exception 'Unsupported requirement type accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.badges (name, requirement_type, requirement_value) values ('x', 'distinct_building_count', 1);
    raise exception 'Unapproved requirement type accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.badges (name, requirement_type, requirement_value) values ('x', 'checkin_count', 0);
    raise exception 'Non-positive threshold accepted';
  exception when check_violation then null;
  end;

  insert into public.badges (name, requirement_type, requirement_value)
    values ('Badge test count 3', 'checkin_count', 3) returning id into count_badge;
  insert into public.badges (name, requirement_type, requirement_value, is_active)
    values ('Badge test inactive', 'checkin_count', 1, false) returning id into inactive_badge;
  perform set_config('badge_test.count_badge', count_badge::text, true);
  perform set_config('badge_test.inactive_badge', inactive_badge::text, true);

  insert into public.checkins (user_id, floor_id, crowd_level, created_at) values
    (user_a, floor_one, 3, clock_timestamp() - interval '3 hours'),
    (user_a, floor_other, 3, clock_timestamp() - interval '2 hours');
  if exists (select 1 from public.user_badges where user_id = user_a) then
    raise exception 'Badge awarded below threshold';
  end if;

  third_checkin_at := clock_timestamp() - interval '1 hour';
  insert into public.checkins (user_id, floor_id, crowd_level, created_at)
    values (user_a, floor_one, 3, third_checkin_at);
  if not exists (select 1 from public.user_badges where user_id = user_a
    and badge_id = count_badge and earned_at = third_checkin_at) then
    raise exception 'Count badge not awarded exactly at threshold with its crossing time';
  end if;
  if exists (select 1 from public.user_badges where user_id = user_a and badge_id = inactive_badge) then
    raise exception 'Inactive badge awarded';
  end if;

  if private.award_user_badges(user_a) <> 0 or private.award_user_badges(user_b) <> 0 then
    raise exception 'Re-evaluation must not award again';
  end if;
  insert into public.checkins (user_id, floor_id, crowd_level) values (user_a, floor_one, 2);
  if (select count(*) from public.user_badges where user_id = user_a) <> 1 then
    raise exception 'Repeated events created duplicate badges';
  end if;
  begin
    insert into public.user_badges (user_id, badge_id) values (user_a, count_badge);
    raise exception 'Duplicate user badge accepted';
  exception when unique_violation then null;
  end;

  insert into public.checkins (user_id, floor_id, crowd_level, created_at) values
    (user_b, floor_one, 1, clock_timestamp() - interval '2 hours'),
    (user_b, floor_one, 1, clock_timestamp() - interval '1 hour');
  if exists (select 1 from public.user_badges where user_id = user_b) then
    raise exception 'Near-threshold user received a badge';
  end if;

  update public.badges set is_active = true where id = inactive_badge;
  perform private.award_all_user_badges();
  perform private.award_all_user_badges();
  if (select count(*) from public.user_badges where badge_id = inactive_badge
    and user_id in (user_a, user_b)) <> 2 then
    raise exception 'Reactivated badge backfill should award both qualifying users once';
  end if;
  update public.badges set is_active = false where id = inactive_badge;
  delete from public.user_badges where user_id = user_b and badge_id = inactive_badge;

  -- Verify streak_days badge awarding and gap handling (Asia/Bangkok days)
  declare
    streak_badge integer;
    day_three_at timestamptz := (date_trunc('day', now() at time zone 'Asia/Bangkok') + interval '9 hours') at time zone 'Asia/Bangkok';
    day_two_at timestamptz := day_three_at - interval '1 day';
    day_one_at timestamptz := day_three_at - interval '2 days';
    gap_day_at timestamptz := day_three_at - interval '4 days';
  begin
    insert into public.badges (name, requirement_type, requirement_value)
      values ('Badge test streak 3', 'streak_days', 3) returning id into streak_badge;
    perform set_config('badge_test.streak_badge', streak_badge::text, true);

    insert into public.checkins (user_id, floor_id, crowd_level, created_at) values
      (user_b, floor_one, 2, gap_day_at),
      (user_b, floor_one, 2, day_one_at),
      (user_b, floor_one, 2, day_two_at);
    if exists (select 1 from public.user_badges where user_id = user_b and badge_id = streak_badge) then
      raise exception 'Streak badge awarded across a gap before 3 consecutive days';
    end if;

    insert into public.checkins (user_id, floor_id, crowd_level, created_at)
      values (user_b, floor_one, 2, day_three_at);
    if not exists (select 1 from public.user_badges where user_id = user_b
      and badge_id = streak_badge and earned_at = day_three_at) then
      raise exception 'Streak badge not awarded on reaching 3 consecutive Bangkok days';
    end if;
  end;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('badge_test.auth_a'), 'role', 'authenticated')::text, true);
do $$
declare
  count_badge integer := current_setting('badge_test.count_badge')::integer;
  inactive_badge integer := current_setting('badge_test.inactive_badge')::integer;
  row record;
begin
  select * into row from public.get_my_badges() where id = count_badge;
  if row.earned_at is null or not row.is_active then
    raise exception 'Own earned badge missing from collection';
  end if;
  select * into row from public.get_my_badges() where id = inactive_badge;
  if row.earned_at is null or row.is_active then
    raise exception 'Earned inactive badge should be returned as inactive';
  end if;
  if exists (select 1 from public.user_badges ub join public.users u on u.id = ub.user_id
    where u.auth_id <> current_setting('badge_test.auth_a')::uuid) then
    raise exception 'Read another user''s earned state';
  end if;
  begin
    insert into public.user_badges (user_id, badge_id)
      select u.id, count_badge from public.users u limit 1;
    raise exception 'Client granted a badge';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.user_badges set earned_at = now();
    raise exception 'Client changed earned state';
  exception when insufficient_privilege then null;
  end;
  begin
    perform private.award_user_badges(1);
    raise exception 'Client invoked awarding';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('badge_test.auth_b'), 'role', 'authenticated')::text, true);
do $$
declare
  count_badge integer := current_setting('badge_test.count_badge')::integer;
  inactive_badge integer := current_setting('badge_test.inactive_badge')::integer;
begin
  if (select earned_at from public.get_my_badges() where id = count_badge) is not null then
    raise exception 'Another user''s earned_at leaked';
  end if;
  if exists (select 1 from public.get_my_badges() where id = inactive_badge) then
    raise exception 'Unearned inactive badge should be hidden';
  end if;
  if exists (select 1 from public.badges where id = inactive_badge) then
    raise exception 'Unearned inactive badge readable';
  end if;
  declare
    streak_row record;
  begin
    select * into streak_row from public.get_my_streak();
    if streak_row.current_streak <> 3 or streak_row.longest_streak <> 3 or not streak_row.checked_in_today then
      raise exception 'Unexpected streak summary for user_b: %', row_to_json(streak_row);
    end if;
  end;
end;
$$;

reset role;
set local role anon;
do $$
begin
  begin
    perform public.get_my_badges();
    raise exception 'Anonymous badge collection read';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.badges;
    raise exception 'Anonymous catalog read';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claims',
  json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
begin
  if exists (select 1 from public.get_my_badges()) then
    raise exception 'A session without a profile must get no badges';
  end if;
end;
$$;

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('badge_test.auth_b'), 'role', 'authenticated')::text, true);
reset role;
delete from public.badges;
set local role authenticated;
do $$
begin
  if exists (select 1 from public.get_my_badges()) then
    raise exception 'Empty catalog should return no badges';
  end if;
end;
$$;
reset role;
rollback;
