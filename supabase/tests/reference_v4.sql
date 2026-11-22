-- Isolated SQL fixtures only: every inserted record rolls back. Never seed these
-- records into the application. Run after floor_schema.sql, with ON_ERROR_STOP=1.
begin;
do $$
declare
  building_id integer;
  floor_id integer;
  reward_id integer;
  profile_id integer;
  role_name text;
  relation_name text;
  schedule public.floor_hours%rowtype;
  reward public.rewards%rowtype;
begin
  foreach role_name in array array['anon', 'authenticated'] loop
    foreach relation_name in array array['locations', 'floors', 'floor_hours',
      'checkins', 'rewards', 'redemptions'] loop
      if exists (select 1 from pg_policies where schemaname = 'public'
        and tablename = relation_name) then
        raise exception 'Unexpected client policy on %', relation_name;
      end if;
    end loop;
    if has_table_privilege(role_name, 'public.floor_hours', 'SELECT')
      or has_table_privilege(role_name, 'public.floor_hours', 'INSERT')
      or has_sequence_privilege(role_name, 'public.floor_hours_id_seq', 'USAGE') then
      raise exception 'Unexpected floor_hours client grant for %', role_name;
    end if;
  end loop;
  if not has_table_privilege('service_role', 'public.floor_hours', 'INSERT')
    or not has_sequence_privilege('service_role', 'public.floor_hours_id_seq', 'USAGE') then
    raise exception 'Trusted server needs floor_hours access';
  end if;

  insert into public.locations (name, category, building, gps_lat, gps_lng)
    values ('SQL assertion only', array['test'], 'N2147483647', 0, 0) returning id into building_id;
  if not exists (select 1 from public.locations where id = building_id
    and aliases = '{}'::text[] and details = '{}'::jsonb) then
    raise exception 'Building defaults do not match v4';
  end if;
  begin
    insert into public.locations (name, category, building, gps_lat, gps_lng)
      values ('SQL assertion only', array['test'], 'N2147483647', 0, 0);
    raise exception 'Duplicate building code accepted';
  exception when unique_violation then null;
  end;
  begin
    update public.locations set building = 'LX' where id = building_id;
    raise exception 'Invalid canonical code accepted';
  exception when check_violation then null;
  end;
  begin
    update public.locations set building = null where id = building_id;
    raise exception 'Missing building code accepted';
  exception when not_null_violation then null;
  end;

  insert into public.floors (location_id, floor_name, qr_code_id)
    values (building_id, 'test', 'sql-assertion-v4-only') returning id into floor_id;
  begin
    update public.floors set capacity = 0 where id = floor_id;
    raise exception 'Nonpositive capacity accepted';
  exception when check_violation then null;
  end;
  insert into public.floor_hours (floor_id, day_of_week)
    values (floor_id, 1) returning * into schedule;
  if schedule.open_time <> '08:00:00'::time or schedule.close_time <> '16:00:00'::time
    or not schedule.is_active then
    raise exception 'Floor-hour defaults do not match v4';
  end if;
  begin
    insert into public.floor_hours (floor_id, day_of_week) values (floor_id, 1);
    raise exception 'Duplicate floor weekday accepted';
  exception when unique_violation then null;
  end;
  begin
    insert into public.floor_hours (floor_id, day_of_week) values (floor_id, 0);
    raise exception 'Invalid weekday accepted';
  exception when check_violation then null;
  end;
  update public.floor_hours set open_time = '00:00:00', close_time = '23:59:59'
    where id = schedule.id;
  update public.floor_hours set open_time = '22:00:00', close_time = '06:00:00', is_active = false
    where id = schedule.id;

  insert into public.rewards (title, points_required, expires_at)
    values ('SQL assertion only', 10, now() + interval '1 day') returning * into reward;
  reward_id := reward.id;
  if reward.stock <> 0 or reward.status <> 'active' then
    raise exception 'Reward defaults do not match v4';
  end if;
  begin
    update public.rewards set stock = null where id = reward_id;
    raise exception 'Null stock accepted';
  exception when not_null_violation then null;
  end;
  begin
    update public.rewards set expires_at = null where id = reward_id;
    raise exception 'Missing reward expiry accepted';
  exception when not_null_violation then null;
  end;
  begin
    update public.rewards set status = 'inactive' where id = reward_id;
    raise exception 'Legacy catalog status accepted';
  exception when check_violation then null;
  end;

  select id into profile_id from public.users order by id limit 1;
  if profile_id is not null then
    insert into public.redemptions (user_id, reward_id, used_points, expires_at)
      values (profile_id, reward_id, 10, reward.expires_at);
    begin
      insert into public.redemptions (user_id, reward_id, used_points, status, expires_at)
        values (profile_id, reward_id, 10, 'pending', reward.expires_at);
      raise exception 'Pending redemption accepted';
    exception when check_violation then null;
    end;
    begin
      insert into public.redemptions (user_id, reward_id, used_points, expires_at)
        values (profile_id, reward_id, 10, now());
      raise exception 'Expired-at-issue redemption accepted';
    exception when check_violation then null;
    end;
    begin
      update public.redemptions set used_at = expires_at where id in (
        select r.id from public.redemptions r where r.reward_id = reward.id);
      raise exception 'Voucher use at expiry accepted';
    exception when check_violation then null;
    end;
  else
    raise notice 'No profile: voucher row assertions skipped; run against Local with an existing account';
  end if;
end;
$$;
rollback;
