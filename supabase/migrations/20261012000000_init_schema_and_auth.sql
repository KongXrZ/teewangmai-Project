create table if not exists public.users (
  id integer generated always as identity primary key,
  auth_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  avatar_url text,
  points integer not null default 0 check (points >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.locations (
  id integer generated always as identity primary key,
  name text not null,
  category text not null,
  building text,
  floor text,
  gps_lat double precision not null,
  gps_lng double precision not null,
  qr_code_id text not null unique,
  image_url text,
  is_active boolean not null default true
);

create table if not exists public.location_hours (
  id integer generated always as identity primary key,
  location_id integer not null references public.locations(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 1 and 7),
  open_time time not null,
  close_time time not null,
  unique (location_id, day_of_week)
);

create table if not exists public.location_profiles (
  location_id integer primary key references public.locations(id) on delete cascade,
  details jsonb not null default '{}'::jsonb
);

create table if not exists public.checkins (
  id integer generated always as identity primary key,
  user_id integer not null references public.users(id) on delete cascade,
  location_id integer not null references public.locations(id) on delete cascade,
  crowd_level integer not null check (crowd_level between 1 and 5),
  created_at timestamptz not null default now()
);

create index if not exists idx_checkins_location_created on public.checkins (location_id, created_at desc);
create index if not exists idx_checkins_user_created on public.checkins (user_id, created_at desc);

create table if not exists public.badges (
  id integer generated always as identity primary key,
  name text not null,
  description text,
  requirement_type text not null,
  requirement_value integer not null check (requirement_value > 0),
  icon_url text,
  is_active boolean not null default true
);

create table if not exists public.user_badges (
  user_id integer not null references public.users(id) on delete cascade,
  badge_id integer not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create table if not exists public.rewards (
  id integer generated always as identity primary key,
  title text not null,
  description text,
  points_required integer not null check (points_required >= 0),
  stock integer check (stock is null or stock >= 0),
  image_url text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  starts_at timestamptz,
  expires_at timestamptz,
  check (expires_at is null or starts_at is null or expires_at > starts_at)
);

create table if not exists public.redemptions (
  id integer generated always as identity primary key,
  user_id integer not null references public.users(id) on delete cascade,
  reward_id integer not null references public.rewards(id) on delete cascade,
  used_points integer not null check (used_points >= 0),
  status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled')),
  redeemed_at timestamptz not null default now()
);

create index if not exists idx_redemptions_user on public.redemptions (user_id, redeemed_at desc);
create index if not exists idx_redemptions_reward on public.redemptions (reward_id, redeemed_at desc);

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

alter table public.users enable row level security;

drop policy if exists "Users can view own profile" on public.users;
create policy "Users can view own profile"
  on public.users for select
  to authenticated
  using ((select auth.uid()) = auth_id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
  on public.users for update
  to authenticated
  using ((select auth.uid()) = auth_id)
  with check ((select auth.uid()) = auth_id);

-- RLS controls rows; column grants also prevent changing email, auth_id, or points.
revoke all on table public.users from public, anon, authenticated;
grant select on table public.users to authenticated;
grant update (name, avatar_url) on table public.users to authenticated;
