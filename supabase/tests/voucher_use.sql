begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000077a1', 'voucher-a@example.test', '{"name":"Voucher SQL A"}'),
  ('00000000-0000-0000-0000-0000000077b2', 'voucher-b@example.test', '{"name":"Voucher SQL B"}');

do $$
declare
  v_a integer;
  v_reward integer;
  v_id integer;
begin
  select id into v_a from public.users where auth_id = '00000000-0000-0000-0000-0000000077a1';
  insert into public.rewards (title, points_required, stock, status, expires_at)
    values ('Voucher SQL coffee', 50, 10, 'active', now() + interval '10 days') returning id into v_reward;
  insert into public.redemptions (user_id, reward_id, used_points, redeemed_at, expires_at)
    values (v_a, v_reward, 50, now() - interval '1 hour', now() + interval '7 days') returning id into v_id;
  perform set_config('test.fresh', v_id::text, true);
  insert into public.redemptions (user_id, reward_id, used_points, redeemed_at, expires_at)
    values (v_a, v_reward, 50, now() - interval '10 days', now() - interval '3 days') returning id into v_id;
  perform set_config('test.expired', v_id::text, true);
  insert into public.redemptions (user_id, reward_id, used_points, redeemed_at, expires_at, used_at, use_code, use_key)
    values (v_a, v_reward, 50, now() - interval '2 hours', now() + interval '7 days',
      now() - interval '31 minutes', repeat('a', 32), gen_random_uuid()) returning id into v_id;
  perform set_config('test.stale', v_id::text, true);
end;
$$;

do $$
begin
  if has_function_privilege('anon', 'public.use_voucher(integer, uuid)', 'execute') then
    raise exception 'anon can use vouchers';
  end if;
  if not has_function_privilege('anon', 'public.verify_voucher_code(text)', 'execute') then
    raise exception 'shops without an account must be able to verify';
  end if;
  if pg_get_function_result('public.verify_voucher_code(text)'::regprocedure) ~ 'user|auth|name|email' then
    raise exception 'verification exposes who owns the voucher';
  end if;
end;
$$;

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-0000000077b2', 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
begin
  if (select outcome from public.use_voucher(current_setting('test.fresh')::integer, gen_random_uuid())) <> 'not_found' then
    raise exception 'another user must not use the voucher';
  end if;
end;
$$;

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-0000000077a1', 'role', 'authenticated')::text, true);

do $$
declare
  v_fresh integer := current_setting('test.fresh')::integer;
  v_key uuid := gen_random_uuid();
  v_result record;
begin
  if (select outcome from public.use_voucher(v_fresh, null)) <> 'validation' then
    raise exception 'use without a key must be rejected';
  end if;
  select * into v_result from public.use_voucher(v_fresh, v_key);
  if v_result.outcome <> 'used' or v_result.use_code !~ '^[0-9a-f]{32}$' then
    raise exception 'first use must return a one-time code: %', row_to_json(v_result);
  end if;
  perform set_config('test.code', v_result.use_code, true);
  perform set_config('test.key', v_key::text, true);
  if (select use_code from public.use_voucher(v_fresh, v_key)) <> v_result.use_code then
    raise exception 'retrying the same use request must return the same code';
  end if;
  select * into v_result from public.use_voucher(v_fresh, gen_random_uuid());
  if v_result.outcome <> 'already_used' or v_result.use_code is not null then
    raise exception 'a new use request must not reveal the code again: %', row_to_json(v_result);
  end if;
  if (select outcome from public.use_voucher(current_setting('test.expired')::integer, gen_random_uuid())) <> 'expired' then
    raise exception 'an expired voucher must not be usable';
  end if;
  if (select status from public.get_my_vouchers() where id = v_fresh) <> 'used' then
    raise exception 'a used voucher must be listed as used';
  end if;
end;
$$;

reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;

do $$
declare
  v_result record;
begin
  select * into v_result from public.verify_voucher_code(current_setting('test.code'));
  if v_result.outcome <> 'verified' or v_result.reward_title <> 'Voucher SQL coffee'
    or v_result.used_points <> 50 or v_result.verified_at is null then
    raise exception 'the first shop scan must verify: %', row_to_json(v_result);
  end if;
  select * into v_result from public.verify_voucher_code(current_setting('test.code'));
  if v_result.outcome <> 'already_verified' or v_result.verified_at is null then
    raise exception 'a second scan must report already verified: %', row_to_json(v_result);
  end if;
  if (select outcome from public.verify_voucher_code(repeat('a', 32))) <> 'expired' then
    raise exception 'a code shown more than 30 minutes ago must not verify';
  end if;
  if (select outcome from public.verify_voucher_code(repeat('0', 32))) <> 'not_found'
    or (select outcome from public.verify_voucher_code('not-a-code')) <> 'not_found'
    or (select outcome from public.verify_voucher_code(null)) <> 'not_found' then
    raise exception 'unknown or malformed codes must be not found';
  end if;
end;
$$;

reset role;

do $$
begin
  if (select count(*) from public.redemptions where verified_at is not null) <> 1
    or (select count(*) from public.redemptions where use_code is not null) <> 2 then
    raise exception 'exactly one fresh voucher must be used and verified';
  end if;
end;
$$;

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-0000000077a1', 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
begin
  if (select use_code from public.use_voucher(current_setting('test.fresh')::integer,
      current_setting('test.key')::uuid)) is not null then
    raise exception 'the same key must not reveal the code after the shop verified it';
  end if;
  if (select use_code from public.use_voucher(current_setting('test.stale')::integer, gen_random_uuid())) is not null then
    raise exception 'a stale used voucher must not reveal its code';
  end if;
end;
$$;

select 'voucher use and verification rules ok' as result;
rollback;
