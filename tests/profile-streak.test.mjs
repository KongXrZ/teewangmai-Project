import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchProfileStreak,
  getProfileStreakSummary,
  parseProfileStreakResponse,
} from "../src/features/profile/components/profile-streak-client.ts";

test("parseProfileStreakResponse maps valid active and zero streak responses", () => {
  assert.deepEqual(
    parseProfileStreakResponse(200, {
      success: true,
      data: {
        current_streak: 5,
        longest_streak: 12,
        checked_in_today: true,
        last_checkin_date: "2026-11-22",
      },
    }),
    {
      ok: true,
      streak: {
        current: 5,
        longest: 12,
        checkedInToday: true,
        lastCheckinDate: "2026-11-22",
      },
    },
  );

  assert.deepEqual(
    parseProfileStreakResponse(200, {
      success: true,
      data: {
        current_streak: 0,
        longest_streak: 0,
        checked_in_today: false,
        last_checkin_date: null,
      },
    }),
    {
      ok: true,
      streak: {
        current: 0,
        longest: 0,
        checkedInToday: false,
        lastCheckinDate: null,
      },
    },
  );
});

test("parseProfileStreakResponse handles 401, 503, and malformed responses", () => {
  assert.deepEqual(parseProfileStreakResponse(401, { success: false }), {
    ok: false,
    unauthorized: true,
  });
  assert.deepEqual(parseProfileStreakResponse(503, { success: false }), {
    ok: false,
    unauthorized: false,
  });
  assert.deepEqual(
    parseProfileStreakResponse(200, { success: true, data: { current_streak: -1 } }),
    { ok: false, unauthorized: false },
  );
});

test("fetchProfileStreak requests /api/profile/streak with same-origin credentials", async () => {
  let capturedUrl = "";
  let capturedInit = null;

  const mockFetch = async (url, init) => {
    capturedUrl = String(url);
    capturedInit = init;
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          current_streak: 3,
          longest_streak: 3,
          checked_in_today: true,
          last_checkin_date: "2026-11-22",
        },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  const result = await fetchProfileStreak({ fetchImpl: mockFetch });
  assert.equal(capturedUrl, "/api/profile/streak");
  assert.equal(capturedInit?.credentials, "same-origin");
  assert.equal(capturedInit?.cache, "no-store");
  assert.deepEqual(result, {
    ok: true,
    streak: {
      current: 3,
      longest: 3,
      checkedInToday: true,
      lastCheckinDate: "2026-11-22",
    },
  });
});

test("getProfileStreakSummary picks clear tone and Thai copy for each streak state", () => {
  assert.equal(getProfileStreakSummary(null).tone, "loading");

  const brandNew = getProfileStreakSummary({
    current: 0,
    longest: 0,
    checkedInToday: false,
    lastCheckinDate: null,
  });
  assert.equal(brandNew.tone, "idle");
  assert.equal(brandNew.valueText, "0 วัน");
  assert.equal(brandNew.subLabel, "เริ่มสตรีค");

  const lapsed = getProfileStreakSummary({
    current: 0,
    longest: 6,
    checkedInToday: false,
    lastCheckinDate: "2026-11-18",
  });
  assert.equal(lapsed.tone, "idle");
  assert.equal(lapsed.subLabel, "สูงสุด 6 วัน");

  const active = getProfileStreakSummary({
    current: 7,
    longest: 7,
    checkedInToday: true,
    lastCheckinDate: "2026-11-22",
  });
  assert.equal(active.tone, "active");
  assert.equal(active.valueText, "7 วัน");
  assert.equal(active.subLabel, "เช็คอินต่อเนื่อง");

  const activeBelowBest = getProfileStreakSummary({
    current: 3,
    longest: 10,
    checkedInToday: true,
    lastCheckinDate: "2026-11-22",
  });
  assert.equal(activeBelowBest.tone, "active");
  assert.equal(activeBelowBest.subLabel, "สูงสุด 10 วัน");

  const atRisk = getProfileStreakSummary({
    current: 4,
    longest: 4,
    checkedInToday: false,
    lastCheckinDate: "2026-11-21",
  });
  assert.equal(atRisk.tone, "at-risk");
  assert.equal(atRisk.valueText, "4 วัน");
  assert.equal(atRisk.subLabel, "เช็คอินวันนี้ต่อ");
});
