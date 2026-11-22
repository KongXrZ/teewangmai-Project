-- BE-006: fixed 30-minute lookback, refreshed every 10 minutes.
create extension if not exists pg_cron;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.floor_crowd_summaries (
  floor_id integer primary key references public.floors(id) on delete cascade,
  capacity integer,
  report_count bigint not null check (report_count >= 0),
  average_score numeric,
  latest_report_at timestamptz,
  calculated_at timestamptz not null,
  check ((report_count = 0 and average_score is null and latest_report_at is null)
    or (report_count > 0 and average_score between 1 and 5 and latest_report_at is not null))
);
alter table private.floor_crowd_summaries enable row level security;
revoke all on private.floor_crowd_summaries from public, anon, authenticated;

create function private.refresh_crowd_summaries()
returns void language plpgsql security invoker set search_path = '' as $$
declare
  calculation_time timestamptz;
begin
  -- Serialize manual/scheduled runs; take the timestamp after acquiring the lock.
  perform pg_catalog.pg_advisory_xact_lock(6006, 1);
  calculation_time := pg_catalog.clock_timestamp();
  insert into private.floor_crowd_summaries
    (floor_id, capacity, report_count, average_score, latest_report_at, calculated_at)
  select f.id, f.capacity, count(c.id), avg(c.crowd_level), max(c.created_at), calculation_time
  from public.floors f
  join public.locations l on l.id = f.location_id and l.is_active
  left join public.checkins c on c.floor_id = f.id
    and c.created_at > calculation_time - interval '30 minutes'
    and c.created_at <= calculation_time
  where f.is_active
  group by f.id
  on conflict (floor_id) do update set
    capacity = excluded.capacity,
    report_count = excluded.report_count,
    average_score = excluded.average_score,
    latest_report_at = excluded.latest_report_at,
    calculated_at = excluded.calculated_at;
  delete from private.floor_crowd_summaries s
  where not exists (select 1 from public.floors f join public.locations l on l.id = f.location_id
    where f.id = s.floor_id and f.is_active and l.is_active);
end;
$$;
revoke all on function private.refresh_crowd_summaries() from public, anon, authenticated, service_role;

-- Intentionally public aggregate read. Definer access is restricted to this fixed
-- projection: callers cannot select individual reports, identities, QR or GPS.
create function public.get_crowd_summaries(p_location_id integer default null, p_floor_id integer default null)
returns table (
  location_id integer, floor_id integer, floor_name text, capacity integer,
  report_count bigint, average_score numeric, density_percent numeric,
  latest_report_at timestamptz, calculated_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select f.location_id, f.id, f.floor_name, s.capacity, s.report_count, s.average_score,
    case when s.report_count > 0 and s.capacity > 0
      then s.report_count * 100.0 / s.capacity else null end,
    s.latest_report_at, s.calculated_at
  from public.floors f
  join public.locations l on l.id = f.location_id and l.is_active
  left join private.floor_crowd_summaries s on s.floor_id = f.id
  where f.is_active and (p_location_id is null or f.location_id = p_location_id)
    and (p_floor_id is null or f.id = p_floor_id)
  order by f.location_id, f.id;
$$;
revoke all on function public.get_crowd_summaries(integer, integer) from public;
grant execute on function public.get_crowd_summaries(integer, integer) to anon, authenticated, service_role;

select private.refresh_crowd_summaries();
select cron.schedule('refresh-floor-crowd-summaries', '*/10 * * * *',
  'select private.refresh_crowd_summaries()');
