begin;
set local lock_timeout = '5s';

create or replace function public.use_voucher(p_redemption_id integer, p_use_key uuid)
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
  elsif v_row.used_at is not null and v_row.use_key = p_use_key and v_row.verified_at is null
    and now() < v_row.used_at + interval '30 minutes' then
    if now() < v_row.expires_at then
      return query select 'used'::text, v_row.id, v_row.used_at, v_row.use_code;
    else
      return query select 'expired'::text, v_row.id, null::timestamptz, null::text;
    end if;
  elsif v_row.used_at is not null then
    return query select 'already_used'::text, v_row.id, v_row.used_at, null::text;
  else
    return query select 'expired'::text, v_row.id, null::timestamptz, null::text;
  end if;
end;
$$;

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
    nullif(pg_catalog.btrim(new.raw_user_meta_data->>'name'), ''),
    nullif(pg_catalog.btrim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(pg_catalog.split_part(new.email, '@', 1), ''),
    'user'
  );
  user_avatar := case
    when new.raw_user_meta_data->>'avatar_url' ~* '^https?://'
      then new.raw_user_meta_data->>'avatar_url'
    when new.raw_user_meta_data->>'picture' ~* '^https?://'
      then new.raw_user_meta_data->>'picture'
  end;

  insert into public.users (auth_id, name, email, avatar_url, points)
  values (new.id, user_name, new.email, user_avatar, 0)
  on conflict (auth_id) do update set
    name = excluded.name,
    email = excluded.email,
    avatar_url = coalesce(excluded.avatar_url, public.users.avatar_url);

  return new;
end;
$$;

create or replace function public.get_my_badges()
returns table (
  id integer, name text, description text, icon_url text,
  requirement_type text, requirement_value integer, is_active boolean,
  earned_at timestamptz
)
language sql stable security invoker set search_path = '' as $$
  with me as (
    select u.id from public.users u where u.auth_id = (select auth.uid())
  )
  select b.id, b.name, b.description, b.icon_url, b.requirement_type,
    b.requirement_value, b.is_active, ub.earned_at
  from me
  cross join public.badges b
  left join public.user_badges ub on ub.badge_id = b.id and ub.user_id = me.id
  where b.is_active or ub.earned_at is not null
  order by ub.earned_at is null, ub.earned_at desc, b.requirement_type, b.requirement_value, b.id;
$$;

notify pgrst, 'reload schema';
commit;
