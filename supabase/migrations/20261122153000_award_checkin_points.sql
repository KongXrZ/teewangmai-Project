begin;
set local lock_timeout = '5s';

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.award_points_after_checkin()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.users u
  set points = u.points + 10
  where u.id = new.user_id;
  return null;
end;
$$;

revoke all on function private.award_points_after_checkin()
  from public, anon, authenticated, service_role;

drop trigger if exists award_points_after_checkin on public.checkins;
create trigger award_points_after_checkin
  after insert on public.checkins
  for each row execute function private.award_points_after_checkin();

drop function if exists public.submit_checkin(text, integer, double precision, double precision, double precision);
create function public.submit_checkin(
  p_qr_code_id text,
  p_crowd_level integer,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_meters double precision
)
returns table (
  outcome text,
  checkin_id integer,
  location_id integer,
  building text,
  location_name text,
  floor_id integer,
  floor_name text,
  crowd_level integer,
  created_at timestamptz,
  next_eligible_at timestamptz,
  distance_meters integer,
  points_awarded integer,
  points_balance integer
)
language plpgsql volatile security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_user_id integer;
  v_floor record;
  v_distance double precision;
  v_last timestamptz;
  v_id integer;
  v_created timestamptz;
  v_points_balance integer;
begin
  if p_qr_code_id is null or p_crowd_level is null or p_crowd_level not between 1 and 5
    or p_latitude is null or p_latitude not between -90 and 90
    or p_longitude is null or p_longitude not between -180 and 180
    or p_accuracy_meters is null or p_accuracy_meters <= 0 then
    return query select 'validation'::text, null::integer, null::integer, null::text, null::text,
      null::integer, null::text, null::integer, null::timestamptz, null::timestamptz,
      null::integer, null::integer, null::integer;
    return;
  end if;

  select u.id into v_user_id from public.users u
  where u.auth_id = (select auth.uid())
  for no key update;
  if not found then
    return query select 'unauthorized'::text, null::integer, null::integer, null::text, null::text,
      null::integer, null::text, null::integer, null::timestamptz, null::timestamptz,
      null::integer, null::integer, null::integer;
    return;
  end if;

  select f.id as floor_id, f.floor_name, l.id as location_id, l.building, l.name as location_name,
    l.gps_lat, l.gps_lng
  into v_floor
  from public.floors f
  join public.locations l on l.id = f.location_id
  where f.qr_code_id = p_qr_code_id and f.is_active and l.is_active;
  if not found then
    return query select 'invalid_qr'::text, null::integer, null::integer, null::text, null::text,
      null::integer, null::text, null::integer, null::timestamptz, null::timestamptz,
      null::integer, null::integer, null::integer;
    return;
  end if;

  if p_accuracy_meters > 100 then
    return query select 'gps_inaccurate'::text, null::integer, v_floor.location_id, v_floor.building,
      v_floor.location_name, v_floor.floor_id, v_floor.floor_name, null::integer, null::timestamptz,
      null::timestamptz, null::integer, null::integer, null::integer;
    return;
  end if;

  v_distance := 2 * 6371000 * asin(least(1, sqrt(
    power(sin(radians(p_latitude - v_floor.gps_lat) / 2), 2)
    + cos(radians(v_floor.gps_lat)) * cos(radians(p_latitude))
      * power(sin(radians(p_longitude - v_floor.gps_lng) / 2), 2)
  )));
  if v_distance > 100 + least(p_accuracy_meters, 50) then
    return query select 'out_of_range'::text, null::integer, v_floor.location_id, v_floor.building,
      v_floor.location_name, v_floor.floor_id, v_floor.floor_name, null::integer, null::timestamptz,
      null::timestamptz, round(v_distance)::integer, null::integer, null::integer;
    return;
  end if;

  select max(c.created_at) into v_last from public.checkins c
  where c.user_id = v_user_id and c.floor_id = v_floor.floor_id
    and c.created_at > now() - interval '30 minutes';
  if v_last is not null then
    return query select 'cooldown'::text, null::integer, v_floor.location_id, v_floor.building,
      v_floor.location_name, v_floor.floor_id, v_floor.floor_name, null::integer, null::timestamptz,
      v_last + interval '30 minutes', null::integer, null::integer, null::integer;
    return;
  end if;

  insert into public.checkins as c (user_id, floor_id, crowd_level)
  values (v_user_id, v_floor.floor_id, p_crowd_level)
  returning c.id, c.created_at into v_id, v_created;

  select u.points into v_points_balance from public.users u where u.id = v_user_id;

  return query select 'recorded'::text, v_id, v_floor.location_id, v_floor.building, v_floor.location_name,
    v_floor.floor_id, v_floor.floor_name, p_crowd_level, v_created, v_created + interval '30 minutes',
    round(v_distance)::integer, 10, v_points_balance;
end;
$$;

revoke all on function public.submit_checkin(text, integer, double precision, double precision, double precision)
  from public, anon, authenticated, service_role;
grant execute on function public.submit_checkin(text, integer, double precision, double precision, double precision)
  to authenticated;

notify pgrst, 'reload schema';
commit;
