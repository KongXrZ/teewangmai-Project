import assert from "node:assert/strict";
import test from "node:test";

const base = process.env.REWARDS_API_TEST_URL;
const email = process.env.VOUCHER_API_TEST_EMAIL;
const password = process.env.VOUCHER_API_TEST_PASSWORD;
const rewardId = process.env.VOUCHER_API_TEST_REWARD_ID;

async function call(path, { cookie, method = "POST", headers = {}, body } = {}) {
  const response = await fetch(new URL(path, base), {
    method,
    headers: {
      ...headers,
      ...(body ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  assert.match(response.headers.get("cache-control") ?? "", /no-store/, path);
  const json = await response.json();
  assert.doesNotMatch(JSON.stringify(json), /"(?:auth_id|user_id|use_key|idempotency_key|email|name)"/, path);
  return { status: response.status, body: json };
}

test("voucher use needs a session but shop verification does not", { skip: !base }, async () => {
  const use = await call("/api/vouchers/1/use", { headers: { "idempotency-key": crypto.randomUUID() } });
  assert.equal(use.status, 401);
  const verify = await call("/api/vouchers/verify", { body: { code: "0".repeat(32) } });
  assert.equal(verify.status, 404);
  assert.equal((await call("/api/vouchers/verify", { body: {} })).status, 400);
  const swagger = await fetch(new URL("/api/swagger", base)).then((response) => response.text());
  assert.match(swagger, /\/api\/vouchers\/verify/);
});

test(
  "a voucher is used once, its code survives a retry and a shop verifies it once",
  { skip: !(base && email && password && rewardId) },
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

    const redeemed = await call(`/api/rewards/${rewardId}/redeem`, {
      cookie,
      headers: { "idempotency-key": crypto.randomUUID() },
    });
    assert.equal(redeemed.status, 200, "Reset the local seed so the account can redeem this reward");
    const voucherId = redeemed.body.data.voucher.id;

    const use = (key) =>
      call(`/api/vouchers/${voucherId}/use`, { cookie, headers: key ? { "idempotency-key": key } : {} });
    assert.equal((await use()).status, 400);
    const key = crypto.randomUUID();
    const used = await use(key);
    assert.equal(used.status, 200);
    assert.match(used.body.data.use_code, /^[0-9a-f]{32}$/);
    assert.equal((await use(key)).body.data.use_code, used.body.data.use_code);
    const again = await use(crypto.randomUUID());
    assert.equal(again.status, 409);
    assert.equal(again.body.code, "already_used");
    assert.equal(JSON.stringify(again.body).includes(used.body.data.use_code), false);

    const vouchers = await call("/api/vouchers", { cookie, method: "GET" });
    const listed = vouchers.body.data.find((voucher) => voucher.id === voucherId);
    assert.equal(listed.status, "used");
    assert.equal("use_code" in listed, false);

    const first = await call("/api/vouchers/verify", { body: { code: used.body.data.use_code.toUpperCase() } });
    assert.equal(first.status, 200);
    assert.equal(first.body.data.used_points, redeemed.body.data.voucher.used_points);
    const second = await call("/api/vouchers/verify", { body: { code: used.body.data.use_code } });
    assert.equal(second.status, 409);
    assert.equal(second.body.code, "already_verified");
    assert.equal(second.body.data.verified_at, first.body.data.verified_at);
  },
);
