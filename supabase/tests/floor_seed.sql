-- Run after migrations and seed.sql with ON_ERROR_STOP=1. Read-only assertions.
do $$
declare
  code text;
begin
  if (select count(*) from public.floors f join public.locations l
    on l.id = f.location_id where l.building ~ '^(S([1-9]|1[0-5])|N([1-9]|1[0-9]|20))$') <> 224 then
    raise exception 'The approved dataset must expand to 224 floors';
  end if;

  foreach code in array array['S8', 'S10', 'N8'] loop
    if (select count(*) from public.floors f join public.locations l
      on l.id = f.location_id where l.building = code) <> 1
      or not exists (select 1 from public.floors f join public.locations l
        on l.id = f.location_id where l.building = code and f.floor_name = '1') then
      raise exception 'Missing floor-count fallback for %', code;
    end if;
  end loop;

  if exists (
    select 1 from public.floors f join public.locations l on l.id = f.location_id
    where l.building ~ '^(S([1-9]|1[0-5])|N([1-9]|1[0-9]|20))$'
      and (f.capacity is distinct from 100 or not f.is_active
        or f.qr_code_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
  ) then
    raise exception 'Expanded floor capacity, activity or generated QR identifier is incorrect';
  end if;
end;
$$;
