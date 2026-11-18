begin;

create function public.get_my_checkins(
  p_limit integer,
  p_before_created_at timestamptz default null,
  p_before_id integer default null
)
returns table (
  id integer, location_id integer, building text, location_name text,
  floor_id integer, floor_name text, crowd_level integer, created_at timestamptz,
  matching_count bigint
)
language sql stable security definer set search_path = '' as $$
  select c.id, l.id, l.building, l.name, f.id, f.floor_name, c.crowd_level, c.created_at,
    count(*) over ()
  from public.checkins c
  join public.users u on u.id = c.user_id
  join public.floors f on f.id = c.floor_id
  join public.locations l on l.id = f.location_id
  where u.auth_id = (select auth.uid())
    and p_limit between 1 and 51
    and (
      p_before_created_at is null
      or (c.created_at, c.id) < (p_before_created_at, coalesce(p_before_id, 2147483647))
    )
  order by c.created_at desc, c.id desc
  limit p_limit;
$$;

revoke all on function public.get_my_checkins(integer, timestamptz, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.get_my_checkins(integer, timestamptz, integer) to authenticated;

notify pgrst, 'reload schema';
commit;
