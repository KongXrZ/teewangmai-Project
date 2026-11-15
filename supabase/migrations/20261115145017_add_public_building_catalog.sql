begin;

-- Public reference reads only. Business writes remain server controlled.
revoke all on public.locations, public.floors, public.floor_hours from public, anon, authenticated;
grant select on public.locations to anon, authenticated;
grant select (id, location_id, floor_name, capacity, is_active)
  on public.floors to anon, authenticated;
grant select on public.floor_hours to anon, authenticated;

create policy "Read active buildings" on public.locations
  for select to anon, authenticated using (is_active);
create policy "Read active floors of active buildings" on public.floors
  for select to anon, authenticated using (
    is_active and exists (
      select 1 from public.locations l where l.id = location_id and l.is_active
    )
  );
-- Include disabled day rows: consumers must distinguish closed from missing hours.
create policy "Read schedules of visible floors" on public.floor_hours
  for select to anon, authenticated using (
    exists (select 1 from public.floors f where f.id = floor_id)
  );

-- A parameterized function avoids composing PostgREST filter expressions from
-- user input, and supports partial matching within text[] without duplicate rows.
create function public.search_locations(search_term text default '', category_filter text default null)
returns setof public.locations
language sql stable security invoker set search_path = ''
as $$
  select l.* from public.locations l
  where l.is_active
    and (
      coalesce(search_term, '') = ''
      or strpos(lower(l.building), lower(search_term)) > 0
      or strpos(lower(l.name), lower(search_term)) > 0
      or exists (
        select 1 from unnest(l.aliases || l.category) term
        where strpos(lower(term), lower(search_term)) > 0
      )
    )
    and (category_filter is null or exists (
      select 1 from unnest(l.category) category
      where lower(category) = lower(category_filter)
    ));
$$;
revoke all on function public.search_locations(text, text) from public;
grant execute on function public.search_locations(text, text) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
commit;
