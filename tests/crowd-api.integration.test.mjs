import assert from "node:assert/strict";
import test from "node:test";

const base = process.env.CROWD_API_TEST_URL;

test("public crowd HTTP contract against Supabase Local", { skip: !base }, async () => {
  async function read(path, expected = 200) {
    const response = await fetch(new URL(path, base));
    assert.equal(response.status, expected, path);
    assert.match(response.headers.get("cache-control"), /no-store/);
    const body = await response.json();
    assert.equal(body.success, expected === 200);
    assert.doesNotMatch(JSON.stringify(body), /"(?:user_id|auth_id|qr_code_id|gps_lat|gps_lng)"/);
    return body;
  }
  const list = await read("/api/crowd/locations");
  assert.equal(list.meta.lookback_minutes, 30);
  assert.equal(list.meta.refresh_minutes, 10);
  assert.ok(list.data.length > 0, "Run against approved Local reference data");
  const card = list.data[0];
  const detail = await read(`/api/crowd/locations/${card.location_id}`);
  assert.equal(detail.data.busiest_floor.floor_id, card.busiest_floor.floor_id);
  assert.ok(detail.data.floors.length > 0);
  const floorOne = detail.data.floors.find(floor => floor.floor_name === "1");
  if (floorOne) assert.equal(detail.data.default_floor_id, floorOne.floor_id);
  const floor = await read(`/api/crowd/locations/${card.location_id}/floors/${card.busiest_floor.floor_id}`);
  assert.equal(floor.data.floor_id, card.busiest_floor.floor_id);
  assert.ok(["unknown", "pending", "ready", "stale"].includes(floor.data.status));
  await read("/api/crowd/locations?q=abc", 400);
  await read("/api/crowd/locations/0", 400);
  await read("/api/crowd/locations/2147483648", 400);
  await read("/api/crowd/locations/2147483647", 404);
  await read(`/api/crowd/locations/2147483647/floors/${card.busiest_floor.floor_id}`, 404);
  const swagger = await fetch(new URL("/api/swagger", base)).then(response => response.text());
  assert.match(swagger, /\/api\/crowd\/locations/);
});
