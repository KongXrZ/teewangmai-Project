-- Keep every exposed application table closed to client roles until its access
-- requirements and row policies are explicitly defined.
alter table public.locations enable row level security;
alter table public.location_hours enable row level security;
alter table public.location_profiles enable row level security;
alter table public.checkins enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.rewards enable row level security;
alter table public.redemptions enable row level security;

-- Validate legacy values before enforcing the URL scheme for all future writes.
update public.users
set avatar_url = null
where avatar_url is not null
  and avatar_url !~* '^https?://';

alter table public.users
  add constraint users_avatar_url_http_scheme
  check (avatar_url is null or avatar_url ~* '^https?://');
