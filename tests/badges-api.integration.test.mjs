import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { parseBadgesResponse } from "../src/features/achievements/api/badges-adapter.ts";

const base = process.env.BADGES_API_TEST_URL;

async function signUpAndLogin() {
  const email = `badge-${randomUUID()}@example.test`;
  const password = `Badge-${randomUUID()}`;
  const headers = { "content-type": "application/json" };
  const signup = await fetch(new URL("/api/auth/signup", base), {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password, name: "Badge API test" }),
  });
  assert.equal(signup.status, 200);
  const login = await fetch(new URL("/api/auth/login", base), {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password }),
  });
  assert.equal(login.status, 200);
  return login.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
}

test("badge HTTP contract without a session", { skip: !base }, async () => {
  const anonymous = await fetch(new URL("/api/badges", base));
  assert.equal(anonymous.status, 401);
  assert.match(anonymous.headers.get("cache-control"), /no-store/);
  const body = await anonymous.json();
  assert.equal(body.success, false);
  assert.equal(body.code, "unauthorized");
  assert.doesNotMatch(JSON.stringify(body), /"(?:user_id|auth_id|badges)"/);

  const query = await fetch(new URL("/api/badges?user_id=1", base));
  assert.equal(query.status, 400);

  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    const write = await fetch(new URL("/api/badges", base), { method });
    assert.equal(write.status, 405, method);
  }

  const swagger = await fetch(new URL("/api/swagger", base)).then((response) => response.text());
  assert.match(swagger, /\/api\/badges/);
});

test("badge HTTP contract with a real login", { skip: !base }, async () => {
  const cookie = await signUpAndLogin();
  assert.ok(cookie.length > 0);

  const response = await fetch(new URL("/api/badges", base), { headers: { cookie } });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /no-store/);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.doesNotMatch(JSON.stringify(body), /"(?:user_id|auth_id)"/);
  assert.equal(body.data.earned_count, 0);
  assert.equal(body.data.total_count, body.data.badges.length);
  assert.ok(body.data.badges.every((badge) => badge.earned_at === null && badge.is_active));
  assert.equal(parseBadgesResponse(response.status, body).kind, "ok");

  const query = await fetch(new URL("/api/badges?user_id=1", base), { headers: { cookie } });
  assert.equal(query.status, 400);

  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    const write = await fetch(new URL("/api/badges", base), { method, headers: { cookie } });
    assert.equal(write.status, 405, method);
  }
});
