begin;
set local lock_timeout = '5s';

alter table public.rewards
  add column max_per_user integer not null default 1,
  add column valid_days integer not null default 7,
  add constraint rewards_max_per_user_check check (max_per_user >= 1),
  add constraint rewards_valid_days_check check (valid_days > 0);

alter table public.redemptions
  add column idempotency_key uuid not null default gen_random_uuid(),
  add column use_code text,
  add column use_key uuid,
  add constraint redemptions_user_idempotency_key unique (user_id, idempotency_key),
  add constraint redemptions_use_code_key unique (use_code),
  add constraint redemptions_use_code_check check (
    (use_code is null and use_key is null) or (used_at is not null and use_code is not null and use_key is not null)
  );

create function private.reward_availability(
  p_reward public.rewards,
  p_points integer,
  p_redeemed_count bigint
)
returns text
language sql stable set search_path = '' as $$
  select case
    when p_reward.status = 'expired' or now() > p_reward.expires_at then 'expired'
    when p_reward.status = 'upcoming'
      or (p_reward.starts_at is not null and now() < p_reward.starts_at) then 'upcoming'
    when p_reward.stock <= 0 then 'out_of_stock'
    when p_redeemed_count >= p_reward.max_per_user then 'limit_reached'
    when p_points < p_reward.points_required then 'insufficient_points'
    else 'redeemable'
  end;
$$;
revoke all on function private.reward_availability(public.rewards, integer, bigint)
  from public, anon, authenticated, service_role;

create function public.get_reward_catalog()
returns table (
  id integer, title text, description text, image_url text, points_required integer,
  stock integer, starts_at timestamptz, expires_at timestamptz, valid_days integer,
  max_per_user integer, redeemed_count bigint, availability text
)
language sql stable security definer set search_path = '' as $$
  select r.id, r.title, r.description, r.image_url, r.points_required, r.stock,
    r.starts_at, r.expires_at, r.valid_days, r.max_per_user, c.redeemed_count,
    private.reward_availability(r, u.points, c.redeemed_count)
  from public.users u
  cross join public.rewards r
  cross join lateral (
    select count(*) as redeemed_count from public.redemptions d
    where d.user_id = u.id and d.reward_id = r.id
  ) c
  where u.auth_id = (select auth.uid())
    and private.reward_availability(r, u.points, c.redeemed_count) <> 'expired'
  order by r.points_required, r.id;
$$;

create function public.redeem_reward(p_reward_id integer, p_idempotency_key uuid)
returns table (
  outcome text, redemption_id integer, reward_id integer, used_points integer,
  points integer, redeemed_at timestamptz, expires_at timestamptz
)
language plpgsql volatile security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_user public.users%rowtype;
  v_reward public.rewards%rowtype;
  v_row public.redemptions%rowtype;
  v_count bigint;
  v_availability text;
begin
  if p_reward_id is null or p_idempotency_key is null then
    return query select 'validation'::text, null::integer, null::integer, null::integer,
      null::integer, null::timestamptz, null::timestamptz;
    return;
  end if;

  select * into v_user from public.users u
  where u.auth_id = (select auth.uid())
  for no key update;
  if not found then
    return query select 'unauthorized'::text, null::integer, null::integer, null::integer,
      null::integer, null::timestamptz, null::timestamptz;
    return;
  end if;

  select * into v_row from public.redemptions d
  where d.user_id = v_user.id and d.idempotency_key = p_idempotency_key;
  if found then
    if v_row.reward_id <> p_reward_id then
      return query select 'key_conflict'::text, null::integer, p_reward_id, null::integer,
        v_user.points, null::timestamptz, null::timestamptz;
      return;
    end if;
    return query select 'replayed'::text, v_row.id, v_row.reward_id, v_row.used_points,
      v_user.points, v_row.redeemed_at, v_row.expires_at;
    return;
  end if;

  select * into v_reward from public.rewards r
  where r.id = p_reward_id
  for no key update;
  if not found then
    return query select 'not_found'::text, null::integer, p_reward_id, null::integer,
      v_user.points, null::timestamptz, null::timestamptz;
    return;
  end if;

  select count(*) into v_count from public.redemptions d
  where d.user_id = v_user.id and d.reward_id = v_reward.id;
  v_availability := private.reward_availability(v_reward, v_user.points, v_count);
  if v_availability <> 'redeemable' then
    return query select v_availability, null::integer, v_reward.id, null::integer,
      v_user.points, null::timestamptz, null::timestamptz;
    return;
  end if;

  update public.users u set points = u.points - v_reward.points_required
  where u.id = v_user.id;
  update public.rewards r set stock = r.stock - 1
  where r.id = v_reward.id;
  insert into public.redemptions as d
    (user_id, reward_id, used_points, idempotency_key, redeemed_at, expires_at)
  values (v_user.id, v_reward.id, v_reward.points_required, p_idempotency_key, now(),
    now() + make_interval(days => v_reward.valid_days))
  returning d.* into v_row;

  return query select 'redeemed'::text, v_row.id, v_row.reward_id, v_row.used_points,
    v_user.points - v_reward.points_required, v_row.redeemed_at, v_row.expires_at;
end;
$$;

create function public.get_my_vouchers()
returns table (
  id integer, reward_id integer, title text, image_url text, used_points integer,
  redeemed_at timestamptz, expires_at timestamptz, used_at timestamptz, status text
)
language sql stable security definer set search_path = '' as $$
  select d.id, d.reward_id, r.title, r.image_url, d.used_points, d.redeemed_at,
    d.expires_at, d.used_at,
    case
      when d.used_at is not null then 'used'
      when now() >= d.expires_at then 'expired'
      else 'available'
    end
  from public.redemptions d
  join public.users u on u.id = d.user_id
  join public.rewards r on r.id = d.reward_id
  where u.auth_id = (select auth.uid())
  order by d.redeemed_at desc, d.id desc;
$$;

create function public.use_voucher(p_redemption_id integer, p_use_key uuid)
returns table (outcome text, id integer, used_at timestamptz, use_code text)
language plpgsql volatile security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_user_id integer;
  v_row public.redemptions%rowtype;
begin
  if p_redemption_id is null or p_use_key is null then
    return query select 'validation'::text, null::integer, null::timestamptz, null::text;
    return;
  end if;

  select u.id into v_user_id from public.users u
  where u.auth_id = (select auth.uid());
  if not found then
    return query select 'unauthorized'::text, null::integer, null::timestamptz, null::text;
    return;
  end if;

  update public.redemptions d
  set used_at = now(), use_code = encode(extensions.gen_random_bytes(16), 'hex'),
    use_key = p_use_key
  where d.id = p_redemption_id and d.user_id = v_user_id
    and d.used_at is null and now() < d.expires_at
  returning d.* into v_row;
  if found then
    return query select 'used'::text, v_row.id, v_row.used_at, v_row.use_code;
    return;
  end if;

  select * into v_row from public.redemptions d
  where d.id = p_redemption_id and d.user_id = v_user_id;
  if not found then
    return query select 'not_found'::text, null::integer, null::timestamptz, null::text;
  elsif v_row.used_at is not null and v_row.use_key = p_use_key then
    return query select 'used'::text, v_row.id, v_row.used_at, v_row.use_code;
  elsif v_row.used_at is not null then
    return query select 'already_used'::text, v_row.id, v_row.used_at, null::text;
  else
    return query select 'expired'::text, v_row.id, null::timestamptz, null::text;
  end if;
end;
$$;

revoke all on function public.get_reward_catalog() from public, anon, authenticated, service_role;
revoke all on function public.redeem_reward(integer, uuid) from public, anon, authenticated, service_role;
revoke all on function public.get_my_vouchers() from public, anon, authenticated, service_role;
revoke all on function public.use_voucher(integer, uuid) from public, anon, authenticated, service_role;
grant execute on function public.get_reward_catalog() to authenticated;
grant execute on function public.redeem_reward(integer, uuid) to authenticated;
grant execute on function public.get_my_vouchers() to authenticated;
grant execute on function public.use_voucher(integer, uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
