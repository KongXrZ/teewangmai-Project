import assert from "node:assert/strict";
import test from "node:test";
import { loadCheckinCooldowns } from "../src/features/locations/components/checkin-cooldowns.ts";

test("cooldowns are per floor and include recent entries on the next history page", async (t) => {
  const now = Date.parse("2026-11-23T03:30:00Z");
  const history = [
    {
      items: [
        { floor_id: 3, created_at: "2026-11-23T03:28:00Z" },
        { floor_id: 3, created_at: "2026-11-23T03:27:00Z" },
      ],
      next_cursor: "next-page",
    },
    {
      items: [
        { floor_id: 4, created_at: "2026-11-23T03:10:00Z" },
        { floor_id: 5, created_at: "2026-11-23T03:00:00Z" },
      ],
      next_cursor: "older-page",
    },
  ];
  const urls = [];
  const signal = new AbortController().signal;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    urls.push(url);
    assert.equal(options.signal, signal);
    assert.equal(options.cache, "no-store");
    return Response.json({ success: true, data: history.shift() });
  });

  assert.deepEqual(
    await loadCheckinCooldowns(signal, now),
    new Map([
      ["3", Date.parse("2026-11-23T03:58:00Z")],
      ["4", Date.parse("2026-11-23T03:40:00Z")],
    ]),
  );
  assert.deepEqual(urls, [
    "/api/profile/checkins?limit=50",
    "/api/profile/checkins?limit=50&cursor=next-page",
  ]);
});
