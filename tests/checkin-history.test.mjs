import assert from "node:assert/strict";
import test from "node:test";
import {
  encodeHistoryCursor,
  isLostSession,
  parseHistoryQuery,
} from "../src/features/profile/server/checkin-history.ts";

const query = (value) => parseHistoryQuery(new URLSearchParams(value));

test("defaults to 20 rows without a cursor", () => {
  assert.deepEqual(query(""), { limit: 20, cursor: null });
  assert.deepEqual(query("limit=1"), { limit: 1, cursor: null });
  assert.deepEqual(query("limit=50"), { limit: 50, cursor: null });
});

test("rejects bad limits and unknown or repeated parameters", () => {
  for (const value of ["limit=0", "limit=51", "limit=-1", "limit=1.5", "limit=01", "limit=", "page=2", "limit=5&limit=6", "cursor=a&cursor=b"]) {
    assert.equal(query(value), null, value);
  }
});

test("round-trips a cursor with microsecond timestamps", () => {
  const cursor = { created_at: "2026-11-17T09:15:30.123456+00:00", id: 42 };
  assert.deepEqual(query(`limit=5&cursor=${encodeHistoryCursor(cursor)}`), { limit: 5, cursor });
});

test("rejects tampered cursors", () => {
  const bad = [
    "not-base64-json",
    Buffer.from("{}").toString("base64url"),
    encodeHistoryCursor({ created_at: "yesterday", id: 1 }),
    encodeHistoryCursor({ created_at: "0000-01-01T00:00:00+00:00", id: 1 }),
    encodeHistoryCursor({ created_at: "2026-02-30T00:00:00+00:00", id: 1 }),
    encodeHistoryCursor({ created_at: "2026-11-17T09:15:30+00:00", id: 0 }),
    encodeHistoryCursor({ created_at: "2026-11-17T09:15:30+00:00", id: 2147483648 }),
  ];
  for (const cursor of bad) assert.equal(query(`cursor=${cursor}`), null, cursor);
});

test("only a missing or expired session counts as signed out", () => {
  assert.equal(isLostSession({ name: "AuthSessionMissingError" }), true);
  assert.equal(isLostSession({ status: 401 }), true);
  assert.equal(isLostSession({ status: 400, code: "refresh_token_not_found" }), true);
  assert.equal(isLostSession({ name: "AuthRetryableFetchError", status: 0 }), false);
  assert.equal(isLostSession({ status: 503 }), false);
});
