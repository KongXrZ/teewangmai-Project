import assert from "node:assert/strict";
import test from "node:test";

const base = process.env.BADGES_API_TEST_URL;

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
