import assert from "node:assert/strict";
import test from "node:test";

import {
  BADGE_REQUIREMENT_TYPES,
  badgeCollection,
  requirementText,
  toBadgeDto,
} from "../src/features/achievements/server/models.ts";
import { parseBadgesResponse } from "../src/features/achievements/api/badges-adapter.ts";

function row(overrides = {}) {
  return {
    id: 1,
    name: "นักสำรวจ",
    description: null,
    icon_url: null,
    requirement_type: "checkin_count",
    requirement_value: 5,
    is_active: true,
    earned_at: null,
    ...overrides,
  };
}

test("supported vocabulary matches the database constraint", () => {
  assert.deepEqual([...BADGE_REQUIREMENT_TYPES], ["checkin_count", "streak_days"]);
});

test("requirement text is derived from type and threshold", () => {
  assert.equal(requirementText("checkin_count", 5), "เช็กอินครบ 5 ครั้ง");
  assert.equal(requirementText("streak_days", 7), "เช็กอินต่อเนื่อง 7 วัน");
  assert.equal(requirementText("distinct_building_count", 3), null);
  assert.equal(requirementText("points_total", 3), null);
});

test("dto keeps real earned_at and inactive flags without inventing values", () => {
  const earnedAt = "2026-11-01T03:15:00+00:00";
  const dto = toBadgeDto(row({ is_active: false, earned_at: earnedAt, icon_url: "https://example.test/a.png" }));
  assert.equal(dto.earned_at, earnedAt);
  assert.equal(dto.is_active, false);
  assert.equal(dto.icon_url, "https://example.test/a.png");
  assert.equal(dto.requirement_text, "เช็กอินครบ 5 ครั้ง");
  assert.deepEqual(Object.keys(dto).sort(), [
    "description", "earned_at", "icon_url", "id", "is_active", "name",
    "requirement_text", "requirement_type", "requirement_value",
  ]);
});

test("blank icon_url becomes null so the adapter accepts the badge", () => {
  assert.equal(toBadgeDto(row({ icon_url: "" })).icon_url, null);
  assert.equal(toBadgeDto(row({ icon_url: "   " })).icon_url, null);
  const data = badgeCollection([row({ icon_url: "" })]);
  assert.equal(parseBadgesResponse(200, { success: true, data }).kind, "ok");
});

test("collection counts earned and locked badges", () => {
  const data = badgeCollection([row(), row({ id: 2, earned_at: "2026-11-01T03:15:00Z" })]);
  assert.equal(data.total_count, 2);
  assert.equal(data.earned_count, 1);
  assert.deepEqual(badgeCollection([]), { badges: [], earned_count: 0, total_count: 0 });
});

test("response is accepted by the achievements adapter", () => {
  const data = badgeCollection([
    row(),
    row({ id: 2, earned_at: "2026-11-01T03:15:00Z", is_active: false }),
  ]);
  const result = parseBadgesResponse(200, { success: true, data });
  assert.equal(result.kind, "ok");
  assert.equal(result.badges.length, 2);
  assert.equal(result.badges[1].earnedAt, "2026-11-01T03:15:00Z");
  assert.equal(result.badges[0].requirement.description, "เช็กอินครบ 5 ครั้ง");
});
