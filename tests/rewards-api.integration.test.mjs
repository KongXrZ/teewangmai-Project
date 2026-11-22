import assert from "node:assert/strict";
import test from "node:test";

const base = process.env.REWARDS_API_TEST_URL;
const email = process.env.REWARDS_API_TEST_EMAIL;
const password = process.env.REWARDS_API_TEST_PASSWORD;
const lastOneId = process.env.REWARDS_API_TEST_LAST_ONE_ID;
const stackId = process.env.REWARDS_API_TEST_STACK_ID;
const availability = new Set([
  "redeemable",
  "insufficient_points",
  "out_of_stock",
  "limit_reached",
  "upcoming",
]);

async function call(path, { cookie, method = "GET", headers = {} } = {}) {
  const response = await fetch(new URL(path, base), {
    method,
    headers: { ...headers, ...(cookie ? { cookie } : {}) },
  });
  assert.match(response.headers.get("cache-control") ?? "", /no-store/, path);
  const body = await response.json();
  assert.doesNotMatch(JSON.stringify(body), /"(?:auth_id|user_id|idempotency_key)"/, path);
  return { status: response.status, body };
}

test("rewards API rejects anonymous callers", { skip: !base }, async () => {
  for (const [path, method] of [
    ["/api/rewards", "GET"],
    ["/api/rewards/1/redeem", "POST"],
    ["/api/vouchers", "GET"],
  ]) {
    const { status, body } = await call(path, { method });
    assert.equal(status, 401, path);
    assert.equal(body.code, "unauthorized");
  }
  const swagger = await fetch(new URL("/api/swagger", base)).then((response) => response.text());
  assert.match(swagger, /\/api\/rewards\/\{rewardId\}\/redeem/);
  assert.match(swagger, /\/api\/vouchers/);
});

test(
  "rewards API redeems once under concurrency and lists own vouchers",
  { skip: !(base && email && password && lastOneId && stackId) },
  async () => {
    const login = await fetch(new URL("/api/auth/login", base), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(login.status, 200);
    const cookie = login.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ");

    const catalog = await call("/api/rewards", { cookie });
    assert.equal(catalog.status, 200);
    assert.equal(typeof catalog.body.data.points, "number");
    for (const reward of catalog.body.data.rewards) {
      assert.ok(availability.has(reward.availability), reward.availability);
      assert.equal(typeof reward.redeemed_count, "number");
    }
    const lastOne = catalog.body.data.rewards.find((reward) => reward.id === Number(lastOneId));
    const stack = catalog.body.data.rewards.find((reward) => reward.id === Number(stackId));
    assert.equal(lastOne?.stock, 1, "Reset the local seed before running");
    assert.equal(stack?.redeemed_count, 0, "Reset the local seed before running");
    assert.equal(stack?.max_per_user, 2);

    const redeem = (id, key) =>
      call(`/api/rewards/${id}/redeem`, {
        cookie,
        method: "POST",
        headers: key ? { "idempotency-key": key } : {},
      });

    assert.equal((await call("/api/rewards?x=1", { cookie })).status, 400);
    assert.equal((await redeem(stackId)).status, 400);
    assert.equal((await redeem(stackId, "not-a-uuid")).status, 400);
    assert.equal((await redeem(0, crypto.randomUUID())).status, 400);
    assert.equal((await redeem(2147483647, crypto.randomUUID())).status, 404);

    const race = await Promise.all(
      Array.from({ length: 10 }, () => redeem(lastOneId, crypto.randomUUID())),
    );
    assert.equal(race.filter((result) => result.status === 200).length, 1);
    assert.ok(
      race
        .filter((result) => result.status !== 200)
        .every((result) => result.status === 409 && result.body.code === "out_of_stock"),
    );
    const afterRace = await call("/api/rewards", { cookie });
    assert.equal(afterRace.body.data.points, catalog.body.data.points - lastOne.points_required);

    const key = crypto.randomUUID();
    const replays = await Promise.all(Array.from({ length: 10 }, () => redeem(stackId, key)));
    assert.ok(replays.every((result) => result.status === 200));
    assert.equal(new Set(replays.map((result) => result.body.data.voucher.id)).size, 1);
    assert.equal(replays.filter((result) => !result.body.data.replayed).length, 1);
    assert.equal((await redeem(lastOneId, key)).status, 422);

    const second = await redeem(stackId, crypto.randomUUID());
    assert.equal(second.status, 200);
    const third = await redeem(stackId, crypto.randomUUID());
    assert.equal(third.status, 409);
    assert.equal(third.body.code, "limit_reached");
    const afterStack = await call("/api/rewards", { cookie });
    assert.equal(
      afterStack.body.data.points,
      afterRace.body.data.points - 2 * stack.points_required,
    );

    const voucherId = replays[0].body.data.voucher.id;
    const vouchers = await call("/api/vouchers", { cookie });
    assert.equal(vouchers.status, 200);
    const listed = vouchers.body.data.find((voucher) => voucher.id === voucherId);
    assert.equal(listed?.status, "available");
    assert.equal(listed?.used_points, stack.points_required);
    assert.equal(
      Date.parse(listed.expires_at) - Date.parse(listed.redeemed_at),
      stack.valid_days * 86_400_000,
    );
    assert.equal(vouchers.body.data.filter((voucher) => voucher.reward_id === stack.id).length, 2);
    assert.equal((await call("/api/vouchers?x=1", { cookie })).status, 400);
  },
);
