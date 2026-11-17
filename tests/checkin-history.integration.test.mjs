import assert from "node:assert/strict";
import test from "node:test";

const base = process.env.CHECKIN_HISTORY_TEST_URL;
const email = process.env.CHECKIN_HISTORY_TEST_EMAIL;
const password = process.env.CHECKIN_HISTORY_TEST_PASSWORD;

async function call(path, cookie) {
  const response = await fetch(new URL(path, base), { headers: cookie ? { cookie } : {} });
  assert.match(response.headers.get("cache-control") ?? "", /no-store/, path);
  const body = await response.json();
  assert.doesNotMatch(JSON.stringify(body), /"(?:user_id|auth_id|qr_code_id|gps_lat|gps_lng)"/, path);
  return { status: response.status, body };
}

test("check-in history rejects anonymous callers", { skip: !base }, async () => {
  const { status, body } = await call("/api/profile/checkins");
  assert.equal(status, 401);
  assert.equal(body.code, "unauthorized");
  const swagger = await fetch(new URL("/api/swagger", base)).then((response) => response.text());
  assert.match(swagger, /\/api\/profile\/checkins/);
});

test(
  "check-in history pages through every own report exactly once",
  { skip: !(base && email && password) },
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

    for (const path of ["?limit=0", "?limit=51", "?page=1", "?cursor=bad"]) {
      assert.equal((await call(`/api/profile/checkins${path}`, cookie)).status, 400, path);
    }

    const first = await call("/api/profile/checkins?limit=2", cookie);
    assert.equal(first.status, 200);
    assert.equal(typeof first.body.data.total, "number");
    assert.ok(first.body.data.total > 2, "Seed more than two check-ins for the account");

    const seen = [];
    let page = first;
    for (let guard = 0; guard < 100; guard += 1) {
      for (const item of page.body.data.items) {
        assert.equal(typeof item.building, "string");
        assert.equal(typeof item.floor_name, "string");
        assert.ok(item.crowd_level >= 1 && item.crowd_level <= 5);
        seen.push(item);
      }
      const cursor = page.body.data.next_cursor;
      if (!cursor) break;
      page = await call(`/api/profile/checkins?limit=2&cursor=${cursor}`, cookie);
      assert.equal(page.status, 200);
      assert.equal("total" in page.body.data, false);
    }

    assert.equal(seen.length, first.body.data.total);
    assert.equal(new Set(seen.map((item) => item.id)).size, seen.length);
    for (let index = 1; index < seen.length; index += 1) {
      const previous = seen[index - 1];
      const current = seen[index];
      const previousAt = Date.parse(previous.created_at);
      const currentAt = Date.parse(current.created_at);
      assert.ok(
        previousAt > currentAt || (previousAt === currentAt && previous.id > current.id),
        "Ordered by created_at desc, id desc",
      );
    }
  },
);
