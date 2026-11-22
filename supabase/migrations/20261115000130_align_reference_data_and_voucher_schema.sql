begin;

set local lock_timeout = '5s';
lock table public.locations, public.floors, public.location_profiles,
  public.location_hours, public.rewards, public.redemptions in access exclusive mode;

-- Refuse ambiguous reference data instead of inventing codes or voucher dates.
do $$
begin
  if exists (select 1 from public.locations
    where building is null or upper(btrim(building)) !~ '^[NS][0-9]+$')
    or exists (select 1 from public.locations
      group by upper(btrim(building)) having count(*) > 1) then
    raise exception 'v4: supply valid unique N/S building codes before migrating';
  end if;
  if exists (select 1 from public.location_hours h where not exists (
    select 1 from public.floors f where f.location_id = h.location_id)) then
    raise exception 'v4: building hours without a floor require an explicit mapping';
  end if;
  if exists (select 1 from public.rewards where expires_at is null) then
    raise exception 'v4: every reward needs an approved fixed expiry before migrating';
  end if;
  -- Old exchanges do not carry an issued voucher deadline/use history.
  -- Review/backfill those records separately; never infer historical outcomes.
  if exists (select 1 from public.redemptions) then
    raise exception 'v4: legacy redemptions need an explicit expiry/status/use mapping before migrating';
  end if;
end;
$$;

update public.locations set building = upper(btrim(building));
comment on column public.locations.building is 'Required unique canonical campus building code (N/S followed by digits).';
alter table public.locations
  alter column building set not null,
  add constraint locations_building_key unique (building),
  add constraint locations_building_format_check check (building ~ '^[NS][0-9]+$'),
  add column aliases text[] not null default '{}'::text[],
  add column details jsonb not null default '{}'::jsonb;

update public.locations l set details = p.details
from public.location_profiles p where p.location_id = l.id;
drop table public.location_profiles;

alter table public.floors
  add column capacity integer,
  add constraint floors_capacity_check check (capacity is null or capacity > 0);

create table public.floor_hours (
  id integer generated always as identity primary key,
  floor_id integer not null references public.floors(id) on delete cascade,
  day_of_week integer not null constraint floor_hours_day_of_week_check
    check (day_of_week between 1 and 7),
  open_time time not null default '08:00:00',
  close_time time not null default '16:00:00',
  is_active boolean not null default true,
  unique (floor_id, day_of_week)
);

-- Legacy building schedules apply to each existing floor; do not create missing
-- weekdays or floors. Old schedule IDs have no dependent foreign keys.
insert into public.floor_hours (floor_id, day_of_week, open_time, close_time)
select f.id, h.day_of_week, h.open_time, h.close_time
from public.location_hours h join public.floors f on f.location_id = h.location_id
order by f.id, h.day_of_week;
drop table public.location_hours;

alter table public.floor_hours enable row level security;
revoke all on table public.floor_hours from public, anon, authenticated;
revoke all on sequence public.floor_hours_id_seq from public, anon, authenticated;
grant all on table public.floor_hours to service_role;
grant all on sequence public.floor_hours_id_seq to service_role;

-- Unknown stock becomes unavailable (0), never unlimited. Legacy inactive
-- catalog entries remain unavailable as upcoming; time bounds still apply.
update public.rewards set stock = 0 where stock is null;
alter table public.rewards drop constraint rewards_status_check;
update public.rewards set status = 'upcoming' where status = 'inactive';
alter table public.rewards
  alter column stock set default 0,
  alter column stock set not null,
  alter column expires_at set not null,
  drop constraint rewards_stock_check,
  add constraint rewards_stock_check check (stock >= 0),
  add constraint rewards_status_check check (status in ('upcoming', 'active', 'expired'));

alter table public.redemptions
  drop constraint redemptions_status_check,
  alter column status set default 'completed',
  add column expires_at timestamptz not null,
  add column used_at timestamptz,
  add constraint redemptions_status_check check (status = 'completed'),
  add constraint redemptions_expiry_check check (expires_at > redeemed_at),
  add constraint redemptions_used_at_check
    check (used_at is null or (used_at >= redeemed_at and used_at < expires_at));

-- No check-in point award, API, scheduler or new client policy is introduced.
notify pgrst, 'reload schema';
commit;
