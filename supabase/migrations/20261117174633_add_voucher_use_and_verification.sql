begin;
set local lock_timeout = '5s';

alter table public.redemptions
  add column use_code text,
  add column use_key uuid,
  add column verified_at timestamptz,
  add constraint redemptions_use_code_key unique (use_code),
  add constraint redemptions_use_code_check check (
    (use_code is null and use_key is null)
    or (used_at is not null and use_code is not null and use_key is not null)
  ),
  add constraint redemptions_verified_at_check check (
    verified_at is null or (use_code is not null and verified_at >= used_at)
  );

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
  elsif v_row.used_at is not null and v_row.use_key = p_use_key and v_row.verified_at is null
    and now() < v_row.used_at + interval '30 minutes' then
    return query select 'used'::text, v_row.id, v_row.used_at, v_row.use_code;
  elsif v_row.used_at is not null then
    return query select 'already_used'::text, v_row.id, v_row.used_at, null::text;
  else
    return query select 'expired'::text, v_row.id, null::timestamptz, null::text;
  end if;
end;
$$;

create function public.verify_voucher_code(p_use_code text)
returns table (
  outcome text, reward_title text, used_points integer, used_at timestamptz,
  verified_at timestamptz
)
language plpgsql volatile security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_row public.redemptions%rowtype;
  v_title text;
begin
  if p_use_code is null or p_use_code !~ '^[0-9a-f]{32}$' then
    return query select 'not_found'::text, null::text, null::integer, null::timestamptz, null::timestamptz;
    return;
  end if;

  update public.redemptions d
  set verified_at = now()
  where d.use_code = p_use_code and d.verified_at is null
    and now() < d.expires_at and now() < d.used_at + interval '30 minutes'
  returning d.* into v_row;
  if found then
    select r.title into v_title from public.rewards r where r.id = v_row.reward_id;
    return query select 'verified'::text, v_title, v_row.used_points, v_row.used_at, v_row.verified_at;
    return;
  end if;

  select * into v_row from public.redemptions d where d.use_code = p_use_code;
  if not found then
    return query select 'not_found'::text, null::text, null::integer, null::timestamptz, null::timestamptz;
    return;
  end if;
  select r.title into v_title from public.rewards r where r.id = v_row.reward_id;
  return query select
    case when v_row.verified_at is not null then 'already_verified' else 'expired' end,
    v_title, v_row.used_points, v_row.used_at, v_row.verified_at;
end;
$$;

revoke all on function public.use_voucher(integer, uuid) from public, anon, authenticated, service_role;
grant execute on function public.use_voucher(integer, uuid) to authenticated;
revoke all on function public.verify_voucher_code(text) from public, anon, authenticated, service_role;
grant execute on function public.verify_voucher_code(text) to anon, authenticated;

notify pgrst, 'reload schema';
commit;
