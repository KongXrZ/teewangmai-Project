import assert from "node:assert/strict";
import test from "node:test";

const base = process.env.CHECKIN_API_TEST_URL;
const email = process.env.CHECKIN_API_TEST_EMAIL;
const password = process.env.CHECKIN_API_TEST_PASSWORD;
const qr = process.env.CHECKIN_API_TEST_QR;
const latitude = Number(process.env.CHECKIN_API_TEST_LAT);
const longitude = Number(process.env.CHECKIN_API_TEST_LNG);

async function post(path, body, cookie) {
  const response = await fetch(new URL(path, base), {
    method: "POST",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
  assert.match(response.headers.get("cache-control") ?? "", /no-store/, path);
  const json = await response.json();
  assert.doesNotMatch(JSON.stringify(json), /"(?:user_id|auth_id|gps_lat|gps_lng|qr_code_id)"/, path);
  return { status: response.status, body: json };
}

test("check-in API rejects anonymous callers", { skip: !base }, async () => {
  for (const path of ["/api/checkins/resolve", "/api/checkins"]) {
    const { status, body } = await post(path, {});
    assert.equal(status, 401, path);
    assert.equal(body.code, "unauthorized");
  }
  const swagger = await fetch(new URL("/api/swagger", base)).then((response) => response.text());
  assert.match(swagger, /\/api\/checkins\/resolve/);
});

test(
  "check-in API resolves a QR and enforces GPS and the 30-minute cooldown",
  { skip: !(base && email && password && qr && latitude && longitude) },
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

    const notFloorQr = await post("/api/checkins/resolve", { qr: "https://example.com/poster" }, cookie);
    assert.equal(notFloorQr.status, 404);
    assert.equal(notFloorQr.body.code, "invalid_qr");
    assert.equal((await post("/api/checkins/resolve", { code: "x" }, cookie)).status, 400);
    assert.equal(
      (await post("/api/checkins/resolve", { qr: "00000000-0000-4000-8000-00000000dead" }, cookie)).status,
      404,
    );
    const resolved = await post("/api/checkins/resolve", { qr }, cookie);
    assert.equal(resolved.status, 200);
    assert.equal(resolved.body.data.floor_ref, qr);
    assert.equal(typeof resolved.body.data.location.building, "string");
    assert.equal(typeof resolved.body.data.floor.name, "string");

    const near = { latitude, longitude };
    const submit = (patch) =>
      post("/api/checkins", { qr, crowd_level: 3, ...near, accuracy_meters: 15, ...patch }, cookie);

    assert.equal((await submit({ crowd_level: 7 })).status, 400);
    const inaccurate = await submit({ accuracy_meters: 250 });
    assert.equal(inaccurate.status, 422);
    assert.equal(inaccurate.body.code, "gps_inaccurate");
    const far = await submit({ latitude: near.latitude + 0.01 });
    assert.equal(far.status, 422);
    assert.equal(far.body.code, "out_of_range");
    assert.ok(far.body.distance_meters > 1000);

    const results = await Promise.all(Array.from({ length: 5 }, () => submit({})));
    const recorded = results.filter((result) => result.status === 201);
    assert.equal(recorded.length, 1, "Clear this account's recent check-ins on the floor before running");
    assert.ok(
      results
        .filter((result) => result.status !== 201)
        .every((result) => result.status === 409 && result.body.code === "cooldown"),
    );
    const record = recorded[0].body.data;
    assert.equal(record.crowd_level, 3);
    assert.equal(
      Date.parse(record.next_eligible_at) - Date.parse(record.created_at),
      30 * 60 * 1000,
    );
    const again = await submit({});
    assert.equal(again.status, 409);
    assert.equal(again.body.next_eligible_at, record.next_eligible_at);
  },
);
