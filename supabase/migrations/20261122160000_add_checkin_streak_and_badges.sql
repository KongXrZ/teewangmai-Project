begin;
set local lock_timeout = '5s';

alter table public.badges
  drop constraint if exists badges_requirement_type_supported;
alter table public.badges
  add constraint badges_requirement_type_supported
  check (requirement_type in ('checkin_count', 'streak_days'));

create or replace function public.get_my_streak()
returns table (
  current_streak integer,
  longest_streak integer,
  checked_in_today boolean,
  last_checkin_date date
)
language sql stable security definer set search_path = '' as $$
  with caller as (
    select u.id
    from public.users u
    where u.auth_id = (select auth.uid())
  ),
  today_bkk as (
    select (now() at time zone 'Asia/Bangkok')::date as d
  ),
  daily_checkins as (
    select distinct (c.created_at at time zone 'Asia/Bangkok')::date as checkin_day
    from public.checkins c
    join caller on caller.id = c.user_id
  ),
  grouped as (
    select
      checkin_day,
      checkin_day - (row_number() over (order by checkin_day))::integer as run_group
    from daily_checkins
  ),
  runs as (
    select
      min(checkin_day) as run_start,
      max(checkin_day) as run_end,
      count(*)::integer as run_length
    from grouped
    group by run_group
  )
  select
    coalesce(
      (
        select r.run_length
        from runs r, today_bkk t
        where r.run_end >= t.d - 1
        order by r.run_end desc
        limit 1
      ),
      0
    )::integer as current_streak,
    coalesce((select max(r.run_length) from runs r), 0)::integer as longest_streak,
    coalesce((select bool_or(r.run_end = t.d) from runs r, today_bkk t), false) as checked_in_today,
    (select max(r.run_end) from runs r) as last_checkin_date
  from caller;
$$;

revoke all on function public.get_my_streak() from public, anon, authenticated, service_role;
grant execute on function public.get_my_streak() to authenticated;

create or replace function private.award_user_badges(p_user_id integer)
returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare
  awarded_count integer := 0;
  awarded_streak integer := 0;
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

  get diagnostics awarded_count = row_count;

  with daily_checkins as (
    select
      (c.created_at at time zone 'Asia/Bangkok')::date as checkin_day,
      min(c.created_at) as first_at
    from public.checkins c
    where c.user_id = p_user_id
    group by 1
  ),
  grouped as (
    select
      checkin_day,
      first_at,
      checkin_day - (row_number() over (order by checkin_day))::integer as run_group
    from daily_checkins
  ),
  streaks as (
    select
      first_at,
      row_number() over (partition by run_group order by checkin_day) as streak_length
    from grouped
  ),
  milestones as (
    select
      streak_length,
      min(first_at) as reached_at
    from streaks
    group by streak_length
  )
  insert into public.user_badges (user_id, badge_id, earned_at)
  select p_user_id, b.id, m.reached_at
  from public.badges b
  join milestones m on m.streak_length = b.requirement_value
  where b.is_active and b.requirement_type = 'streak_days'
  on conflict (user_id, badge_id) do nothing;

  get diagnostics awarded_streak = row_count;
  return awarded_count + awarded_streak;
end;
$$;

revoke all on function private.award_user_badges(integer)
  from public, anon, authenticated, service_role;

insert into public.badges (name, description, requirement_type, requirement_value, is_active)
select s.name, s.description, 'streak_days', s.requirement_value, true
from (
  values
    ('สายเช็คอินต่อเนื่อง 3 วัน', 'เช็คอินรายงานความหนาแน่นต่อเนื่องครบ 3 วัน', 3),
    ('นักรายงานไฟแรง 7 วัน', 'เช็คอินรายงานความหนาแน่นต่อเนื่องครบ 7 วัน', 7),
    ('แชมป์ต่อเนื่อง 14 วัน', 'เช็คอินรายงานความหนาแน่นต่อเนื่องครบ 14 วัน', 14),
    ('ตำนานเช็คอิน 30 วัน', 'เช็คอินรายงานความหนาแน่นต่อเนื่องครบ 30 วัน', 30)
) as s(name, description, requirement_value)
where not exists (
  select 1 from public.badges b
  where b.requirement_type = 'streak_days'
    and b.requirement_value = s.requirement_value
);

do $$
begin
  perform private.award_all_user_badges();
end;
$$;

notify pgrst, 'reload schema';
commit;
