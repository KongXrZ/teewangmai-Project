-- Run after migrations and seed.sql with ON_ERROR_STOP=1. Read-only assertions.
do $$
begin
  if (
    select count(*)
    from public.floor_hours fh
    join public.floors f on f.id = fh.floor_id
    join public.locations l on l.id = f.location_id
    where l.building ~ '^(S([1-9]|1[0-5])|N([1-9]|1[0-9]|20))$'
  ) <> 1120 then
    raise exception 'The approved floor dataset must have 1,120 weekday floor_hours rows (224 floors x 5 weekdays)';
  end if;

  if exists (
    select 1
    from public.floors f
    join public.locations l on l.id = f.location_id
    where l.building ~ '^(S([1-9]|1[0-5])|N([1-9]|1[0-9]|20))$'
      and (
        select count(*)
        from public.floor_hours fh
        where fh.floor_id = f.id and fh.day_of_week between 1 and 5
      ) <> 5
  ) then
    raise exception 'Every approved floor must have Monday-Friday (1..5) floor_hours rows';
  end if;

  if exists (
    select 1
    from public.floor_hours fh
    join public.floors f on f.id = fh.floor_id
    join public.locations l on l.id = f.location_id
    where l.building ~ '^(S([1-9]|1[0-5])|N([1-9]|1[0-9]|20))$'
      and (
        fh.day_of_week not between 1 and 5
        or fh.open_time <> '08:00:00'::time
        or fh.close_time <> '17:00:00'::time
        or not fh.is_active
      )
  ) then
    raise exception 'Seeded floor_hours rows must be Monday-Friday 08:00:00-17:00:00 and active';
  end if;
end;
$$;
