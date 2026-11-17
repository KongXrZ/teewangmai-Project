begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000011a1', 'rewards-a@example.test', '{"name":"Rewards SQL A"}'),
  ('00000000-0000-0000-0000-0000000011b2', 'rewards-b@example.test', '{"name":"Rewards SQL B"}');
update public.users set points = 100 where auth_id = '00000000-0000-0000-0000-0000000011a1';
update public.users set points = 0 where auth_id = '00000000-0000-0000-0000-0000000011b2';

do $$
declare
  v_id integer;
begin
  insert into public.rewards (title, points_required, stock, max_per_user, valid_days, status, expires_at)
    values ('SQL stack', 30, 5, 2, 7, 'active', now() + interval '10 days') returning id into v_id;
  perform set_config('test.stack', v_id::text, true);
  insert into public.rewards (title, points_required, stock, max_per_user, status, expires_at)
    values ('SQL last one', 10, 1, 5, 'active', now() + interval '10 days') returning id into v_id;
  perform set_config('test.last', v_id::text, true);
  insert into public.rewards (title, points_required, stock, status, starts_at, expires_at)
    values ('SQL upcoming', 10, 5, 'active', now() + interval '1 day', now() + interval '10 days') returning id into v_id;
  perform set_config('test.upcoming', v_id::text, true);
  insert into public.rewards (title, points_required, stock, status, starts_at, expires_at)
    values ('SQL expired', 10, 5, 'active', now() - interval '10 days', now() - interval '1 hour') returning id into v_id;
  perform set_config('test.expired', v_id::text, true);
  insert into public.rewards (title, points_required, stock, status, expires_at)
    values ('SQL pricey', 1000, 5, 'active', now() + interval '10 days') returning id into v_id;
  perform set_config('test.pricey', v_id::text, true);
end;
$$;

do $$
begin
  if has_function_privilege('anon', 'public.redeem_reward(integer, uuid)', 'execute')
    or has_function_privilege('anon', 'public.get_reward_catalog()', 'execute')
    or has_function_privilege('anon', 'public.get_my_vouchers()', 'execute')
    or has_function_privilege('anon', 'public.use_voucher(integer, uuid)', 'execute') then
    raise exception 'anon can execute reward functions';
  end if;
  if has_function_privilege('authenticated',
      'private.reward_availability(public.rewards, integer, bigint)', 'execute') then
    raise exception 'authenticated can execute the private availability helper';
  end if;
  if pg_get_function_result('public.get_my_vouchers()'::regprocedure) ~ 'use_code|use_key|idempotency_key' then
    raise exception 'voucher list exposes use_code';
  end if;
end;
$$;

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-00000000ffff', 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
begin
  if (select outcome from public.redeem_reward(current_setting('test.stack')::integer, gen_random_uuid())) <> 'unauthorized'
    or (select outcome from public.use_voucher(1, gen_random_uuid())) <> 'unauthorized'
    or exists (select 1 from public.get_reward_catalog())
    or exists (select 1 from public.get_my_vouchers()) then
    raise exception 'unknown user must be unauthorized and see nothing';
  end if;
end;
$$;

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-0000000011a1', 'role', 'authenticated')::text, true);

do $$
declare
  v_stack integer := current_setting('test.stack')::integer;
  v_last integer := current_setting('test.last')::integer;
  v_first record;
  v_result record;
  v_key uuid := gen_random_uuid();
  v_use_key uuid := gen_random_uuid();
begin
  if exists (select 1 from public.rewards) then
    raise exception 'authenticated can read rewards directly';
  end if;
  if (select availability from public.get_reward_catalog() where id = v_stack) <> 'redeemable'
    or (select availability from public.get_reward_catalog() where id = current_setting('test.upcoming')::integer) <> 'upcoming'
    or (select availability from public.get_reward_catalog() where id = current_setting('test.pricey')::integer) <> 'insufficient_points'
    or exists (select 1 from public.get_reward_catalog() where id = current_setting('test.expired')::integer) then
    raise exception 'catalog availability is wrong: %',
      (select json_agg(row_to_json(c)) from public.get_reward_catalog() c);
  end if;

  select * into v_first from public.redeem_reward(v_stack, v_key);
  if v_first.outcome <> 'redeemed' or v_first.points <> 70 or v_first.used_points <> 30
    or v_first.expires_at <> v_first.redeemed_at + interval '7 days' then
    raise exception 'first redemption is wrong: %', row_to_json(v_first);
  end if;

  select * into v_result from public.redeem_reward(v_stack, v_key);
  if v_result.outcome <> 'replayed' or v_result.redemption_id <> v_first.redemption_id or v_result.points <> 70 then
    raise exception 'replay must return the same voucher without charging: %', row_to_json(v_result);
  end if;
  if (select outcome from public.redeem_reward(v_last, v_key)) <> 'key_conflict' then
    raise exception 'reusing a key for another reward must conflict';
  end if;

  if (select outcome from public.redeem_reward(v_stack, gen_random_uuid())) <> 'redeemed' then
    raise exception 'second stacked voucher must be allowed';
  end if;
  select * into v_result from public.redeem_reward(v_stack, gen_random_uuid());
  if v_result.outcome <> 'limit_reached' or v_result.points <> 40 then
    raise exception 'third voucher must hit max_per_user without charging: %', row_to_json(v_result);
  end if;
  if (select availability from public.get_reward_catalog() where id = v_stack) <> 'limit_reached'
    or (select redeemed_count from public.get_reward_catalog() where id = v_stack) <> 2 then
    raise exception 'catalog must show limit_reached after two vouchers';
  end if;

  if (select outcome from public.redeem_reward(v_last, gen_random_uuid())) <> 'redeemed'
    or (select outcome from public.redeem_reward(v_last, gen_random_uuid())) <> 'out_of_stock'
    or (select outcome from public.redeem_reward(current_setting('test.pricey')::integer, gen_random_uuid())) <> 'insufficient_points'
    or (select outcome from public.redeem_reward(current_setting('test.upcoming')::integer, gen_random_uuid())) <> 'upcoming'
    or (select outcome from public.redeem_reward(current_setting('test.expired')::integer, gen_random_uuid())) <> 'expired'
    or (select outcome from public.redeem_reward(2147483647, gen_random_uuid())) <> 'not_found'
    or (select outcome from public.redeem_reward(v_stack, null)) <> 'validation' then
    raise exception 'rejection outcomes are wrong';
  end if;

  if (select count(*) from public.get_my_vouchers()) <> 3
    or exists (select 1 from public.get_my_vouchers() where status <> 'available') then
    raise exception 'voucher list is wrong: %', (select json_agg(row_to_json(v)) from public.get_my_vouchers() v);
  end if;

  if (select outcome from public.use_voucher(v_first.redemption_id, null)) <> 'validation' then
    raise exception 'use without a key must be rejected';
  end if;
  select * into v_result from public.use_voucher(v_first.redemption_id, v_use_key);
  if v_result.outcome <> 'used' or v_result.use_code !~ '^[0-9a-f]{32}$' then
    raise exception 'first use must return a one-time code: %', row_to_json(v_result);
  end if;
  if (select use_code from public.use_voucher(v_first.redemption_id, v_use_key)) <> v_result.use_code then
    raise exception 'retrying the same use request must return the same code';
  end if;
  select * into v_result from public.use_voucher(v_first.redemption_id, gen_random_uuid());
  if v_result.outcome <> 'already_used' or v_result.use_code is not null then
    raise exception 'a new use request must not return the code again: %', row_to_json(v_result);
  end if;
  if (select status from public.get_my_vouchers() where id = v_first.redemption_id) <> 'used' then
    raise exception 'used voucher must be listed as used';
  end if;
  perform set_config('test.voucher', v_first.redemption_id::text, true);
end;
$$;

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-0000000011b2', 'role', 'authenticated')::text, true);

do $$
begin
  if (select outcome from public.use_voucher(current_setting('test.voucher')::integer, gen_random_uuid())) <> 'not_found'
    or exists (select 1 from public.get_my_vouchers())
    or (select outcome from public.redeem_reward(current_setting('test.last')::integer, gen_random_uuid())) <> 'out_of_stock'
    or (select outcome from public.redeem_reward(current_setting('test.stack')::integer, gen_random_uuid())) <> 'insufficient_points'
    or (select redeemed_count from public.get_reward_catalog() where id = current_setting('test.stack')::integer) <> 0 then
    raise exception 'another user must not see or use vouchers that are not theirs';
  end if;
end;
$$;

reset role;

do $$
declare
  v_id integer;
begin
  insert into public.redemptions (user_id, reward_id, used_points, redeemed_at, expires_at)
  select u.id, current_setting('test.stack')::integer, 0, now() - interval '10 days', now() - interval '3 days'
  from public.users u where u.auth_id = '00000000-0000-0000-0000-0000000011a1'
  returning id into v_id;
  perform set_config('test.expired_voucher', v_id::text, true);
end;
$$;

do $$
begin
  if (select stock from public.rewards where id = current_setting('test.stack')::integer) <> 3
    or (select stock from public.rewards where id = current_setting('test.last')::integer) <> 0
    or (select points from public.users where auth_id = '00000000-0000-0000-0000-0000000011a1') <> 30
    or (select points from public.users where auth_id = '00000000-0000-0000-0000-0000000011b2') <> 0 then
    raise exception 'balances or stock do not match the successful redemptions';
  end if;
end;
$$;

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-0000000011a1', 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
begin
  if (select outcome from public.use_voucher(current_setting('test.expired_voucher')::integer, gen_random_uuid())) <> 'expired'
    or (select status from public.get_my_vouchers()
      where id = current_setting('test.expired_voucher')::integer) <> 'expired' then
    raise exception 'expired voucher must not be usable';
  end if;
end;
$$;

select 'rewards redemption rules ok' as result;
rollback;
