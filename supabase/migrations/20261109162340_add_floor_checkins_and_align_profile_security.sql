begin;

set local lock_timeout = '5s';

-- Freeze legacy writes while the location-to-floor mapping is moved.
lock table public.locations, public.checkins in access exclusive mode;

-- A legacy row cannot be assigned an invented floor or QR. Resolve ambiguous
-- data before retrying; the transaction leaves the existing schema intact.
do $$
begin
  if exists (
    select 1 from public.locations
    where floor is null or pg_catalog.btrim(floor) = ''
      or pg_catalog.btrim(qr_code_id) = ''
  ) then
    raise exception 'Assign a non-empty floor and QR to every legacy location before migrating';
  end if;
end;
$$;

create table public.floors (
  id integer generated always as identity primary key,
  location_id integer not null references public.locations(id) on delete cascade,
  floor_name text not null check (pg_catalog.btrim(floor_name) <> ''),
  qr_code_id text not null unique check (pg_catalog.btrim(qr_code_id) <> ''),
  is_active boolean not null default true,
  unique (location_id, floor_name)
);

comment on table public.locations is 'Campus buildings; GPS verifies proximity to the building.';
comment on column public.locations.building is 'Optional legacy building label/code; locations.id identifies the building.';
comment on table public.floors is 'Floors belonging to buildings. Each printable QR resolves to one floor.';

-- Preserve each legacy location ID and its QR. Do not infer that separate
-- location rows represent the same building or merge their histories.
insert into public.floors (location_id, floor_name, qr_code_id, is_active)
select id, pg_catalog.btrim(floor), qr_code_id, is_active
from public.locations;

alter table public.checkins add column floor_id integer;

update public.checkins as checkin
set floor_id = floor.id
from public.floors as floor
where floor.location_id = checkin.location_id;

do $$
begin
  if exists (select 1 from public.checkins where floor_id is null) then
    raise exception 'Every existing check-in must resolve to a floor before migrating';
  end if;
end;
$$;

alter table public.checkins
  alter column floor_id set not null,
  add constraint checkins_floor_id_fkey
    foreign key (floor_id) references public.floors(id) on delete cascade;

drop index public.idx_checkins_location_created;
alter table public.checkins drop column location_id;
alter table public.locations drop column floor, drop column qr_code_id;

create index idx_checkins_floor_created on public.checkins (floor_id, created_at desc);
create index idx_checkins_user_floor_created on public.checkins (user_id, floor_id, created_at desc);

-- Feature read/submit policies are introduced with their trusted API paths.
-- In particular, a client cannot bypass GPS/QR/cooldown validation by inserting
-- a check-in directly. This migration does not implement that validation yet.
alter table public.floors enable row level security;
revoke all on table public.floors from public, anon, authenticated;
revoke all on sequence public.floors_id_seq from public, anon, authenticated;

-- Repair installations that recorded the original auth migration before its
-- trigger/grants were hardened. This also works after a clean baseline replay.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  user_name text;
  user_avatar text;
begin
  user_name := coalesce(
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'full_name',
    pg_catalog.split_part(new.email, '@', 1)
  );
  user_avatar := coalesce(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture'
  );

  insert into public.users (auth_id, name, email, avatar_url, points)
  values (new.id, user_name, new.email, user_avatar, 0)
  on conflict (auth_id) do update set
    name = excluded.name,
    avatar_url = coalesce(excluded.avatar_url, public.users.avatar_url);

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

drop trigger if exists before_update_user_protect_points on public.users;
drop function if exists public.protect_user_points();
drop function if exists public.handle_new_user();

alter table public.users enable row level security;

drop policy if exists "Users can view own profile" on public.users;
create policy "Users can view own profile"
  on public.users for select to authenticated
  using ((select auth.uid()) = auth_id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
  on public.users for update to authenticated
  using ((select auth.uid()) = auth_id)
  with check ((select auth.uid()) = auth_id);

-- Revoke both table-level and explicit column-level legacy privileges.
revoke all on table public.users from public, anon, authenticated;
revoke all (id, auth_id, name, email, avatar_url, points, created_at)
  on table public.users from public, anon, authenticated;
grant select on table public.users to authenticated;
grant update (name, avatar_url) on table public.users to authenticated;

notify pgrst, 'reload schema';

commit;
