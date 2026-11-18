alter table public.badges
  add constraint badges_requirement_type_supported
  check (requirement_type = 'checkin_count');

create index if not exists idx_user_badges_badge on public.user_badges (badge_id);

revoke all on table public.badges from public, anon, authenticated;
revoke all on table public.user_badges from public, anon, authenticated;
grant select on table public.badges to authenticated;
grant select on table public.user_badges to authenticated;

create policy "Read own earned badges" on public.user_badges
  for select to authenticated
  using (user_id = (select u.id from public.users u where u.auth_id = (select auth.uid())));

create policy "Read active or own earned badges" on public.badges
  for select to authenticated
  using (
    is_active
    or exists (
      select 1 from public.user_badges ub
      where ub.badge_id = badges.id
        and ub.user_id = (select u.id from public.users u where u.auth_id = (select auth.uid()))
    )
  );

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create function private.award_user_badges(p_user_id integer)
returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare
  awarded integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(6013, p_user_id);

  with checkin_progress as (
    select c.created_at as reached_at,
      row_number() over (order by c.created_at, c.id) as reached
    from public.checkins c
    where c.user_id = p_user_id
  )
  insert into public.user_badges (user_id, badge_id, earned_at)
  select p_user_id, b.id, p.reached_at
  from public.badges b
  join checkin_progress p on p.reached = b.requirement_value
  where b.is_active and b.requirement_type = 'checkin_count'
  on conflict (user_id, badge_id) do nothing;

  get diagnostics awarded = row_count;
  return awarded;
end;
$$;
revoke all on function private.award_user_badges(integer) from public, anon, authenticated, service_role;

create function private.award_all_user_badges()
returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare
  total integer := 0;
  profile_id integer;
begin
  for profile_id in select distinct c.user_id from public.checkins c order by c.user_id loop
    total := total + private.award_user_badges(profile_id);
  end loop;
  return total;
end;
$$;
revoke all on function private.award_all_user_badges() from public, anon, authenticated, service_role;

create function private.award_badges_after_checkin()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.award_user_badges(new.user_id);
  return null;
end;
$$;
revoke all on function private.award_badges_after_checkin() from public, anon, authenticated, service_role;

create trigger award_badges_after_checkin
  after insert on public.checkins
  for each row execute function private.award_badges_after_checkin();

create function public.get_my_badges()
returns table (
  id integer, name text, description text, icon_url text,
  requirement_type text, requirement_value integer, is_active boolean,
  earned_at timestamptz
)
language sql stable security invoker set search_path = '' as $$
  select b.id, b.name, b.description, b.icon_url, b.requirement_type,
    b.requirement_value, b.is_active, ub.earned_at
  from public.badges b
  left join public.user_badges ub on ub.badge_id = b.id
    and ub.user_id = (select u.id from public.users u where u.auth_id = (select auth.uid()))
  where b.is_active or ub.earned_at is not null
  order by ub.earned_at is null, ub.earned_at desc, b.requirement_type, b.requirement_value, b.id;
$$;
revoke all on function public.get_my_badges() from public, anon;
grant execute on function public.get_my_badges() to authenticated, service_role;
