import assert from "node:assert/strict";
import test from "node:test";
import { resolveSchema, submitSchema } from "../src/features/checkins/server/request.ts";

const qr = "5a301e53-6402-4c45-abb5-b35c533a0e8c";
const valid = { qr, crowd_level: 3, latitude: 13.65, longitude: 100.49, accuracy_meters: 20 };

test("accepts the floor-uuid-v1 QR payload and normalises case and spaces", () => {
  assert.deepEqual(resolveSchema.parse({ qr: ` ${qr.toUpperCase()} ` }), { qr });
  assert.deepEqual(submitSchema.parse(valid), valid);
});

test("rejects URLs, other payloads and extra fields", () => {
  for (const value of [`https://example.com/scan?q=${qr}`, "N7-1", "", qr.replace(/-/g, "")]) {
    assert.equal(resolveSchema.safeParse({ qr: value }).success, false, value);
  }
  assert.equal(resolveSchema.safeParse({ qr, floor_id: 1 }).success, false);
  assert.equal(submitSchema.safeParse({ ...valid, user_id: 1 }).success, false);
});

test("rejects out-of-range check-in values", () => {
  for (const patch of [
    { crowd_level: 0 },
    { crowd_level: 6 },
    { crowd_level: 2.5 },
    { latitude: 91 },
    { longitude: -181 },
    { accuracy_meters: 0 },
    { accuracy_meters: "10" },
  ]) {
    assert.equal(submitSchema.safeParse({ ...valid, ...patch }).success, false, JSON.stringify(patch));
  }
});
