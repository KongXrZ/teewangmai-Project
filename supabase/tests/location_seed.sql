-- Run after migrations and seed.sql with psql -v ON_ERROR_STOP=1.
-- Checks approved reference records without changing application data.
do $$
declare
  code text;
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'locations'
      and column_name = 'category' and udt_name = '_text' and is_nullable = 'NO'
  ) then
    raise exception 'locations.category must be required text[]';
  end if;

  for code in
    select 'S' || n from generate_series(1, 15) n
    union all select 'N' || n from generate_series(1, 20) n
  loop
    if not exists (select 1 from public.locations where building = code) then
      raise exception 'Missing approved building %', code;
    end if;
  end loop;

  if not exists (select 1 from public.locations where building = 'S7' and not is_active)
    or exists (select 1 from public.locations where building = 'S7' and is_active) then
    raise exception 'S7 must be inactive';
  end if;
  if not exists (select 1 from public.locations where building = 'S5'
    and category = array['หอพักนักศึกษา', 'โรงอาหาร'])
    or not exists (select 1 from public.locations where building = 'S6'
      and category = array['หอพักนักศึกษา', 'โรงอาหาร']) then
    raise exception 'Approved multiple categories were not preserved';
  end if;
  if not exists (select 1 from public.locations where building = 'N16'
    and category = array['อาคารเรียน'] and aliases @> array['LX']) then
    raise exception 'Default category or LX alias is missing';
  end if;
  if not exists (select 1 from public.locations where building = 'S14'
    and aliases = array['KFC', 'Fitness', 'โรงยิม']
    and details->>'description' = 'โรงอาหาร kfc ชั้นบนคือโรงยิม') then
    raise exception 'Alias parsing or detail mapping is incorrect';
  end if;
end;
$$;
