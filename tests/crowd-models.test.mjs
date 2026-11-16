import assert from "node:assert/strict";
import test from "node:test";
import { floorSummary, buildingSummary, buildingCards } from "../src/features/crowd/models.ts";

const now = new Date("2026-11-16T03:10:00Z");
const row = (changes = {}) => ({
  location_id: 1, floor_id: 1, floor_name: "1", capacity: 500,
  report_count: 250, average_score: 3, density_percent: 50,
  latest_report_at: "2026-11-16T03:08:00Z", calculated_at: now.toISOString(), ...changes,
});

test("count and percentage describe occupancy; score controls the label independently", () => {
  const result = floorSummary(row({ average_score: 5 }), now);
  assert.equal(result.estimated_people, 250);
  assert.equal(result.density_percent, 50);
  assert.equal(result.level, "high");
  assert.equal(result.window_start, "2026-11-16T02:40:00.000Z");
  for (const [score, level] of [[1, "low"], [2.499, "low"], [2.5, "medium"], [3.499, "medium"], [3.5, "high"], [5, "high"]]) {
    assert.equal(floorSummary(row({ average_score: score }), now).level, level);
  }
});

test("no reports, missing capacity, pending calculation and overdue scheduler remain distinct", () => {
  const empty = floorSummary(row({ report_count: 0, average_score: null, density_percent: null, latest_report_at: null }), now);
  assert.equal(empty.status, "unknown");
  assert.equal(empty.estimated_people, 0);
  assert.equal(empty.density_percent, null);
  assert.equal(empty.level, null);
  const missingCapacity = floorSummary(row({ capacity: null, density_percent: null }), now);
  assert.equal(missingCapacity.estimated_people, 250);
  assert.equal(missingCapacity.density_percent, null);
  assert.equal(missingCapacity.level, "medium");
  assert.equal(floorSummary(row({ calculated_at: null, report_count: null }), now).status, "pending");
  const stale = floorSummary(row({ calculated_at: "2026-11-16T02:50:00Z" }), now);
  assert.equal(stale.status, "stale");
  assert.equal(stale.estimated_people, null);
  assert.equal(stale.level, null);
});

test("building card takes the greatest count; detail defaults to floor 1", () => {
  const rows = [row({ floor_id: 10, floor_name: "10", report_count: 300, density_percent: 60 }), row(),
    row({ floor_id: 2, floor_name: "2", capacity: 100, report_count: 200, density_percent: 200 })];
  const result = buildingSummary(rows, now);
  assert.equal(result.busiest_floor.floor_id, 10);
  assert.equal(result.default_floor_id, 1);
  assert.deepEqual(result.floors.map(floor => floor.floor_name), ["1", "2", "10"]);
  assert.equal(buildingSummary([row({ floor_name: "2", floor_id: 2 }), row()], now).busiest_floor.floor_id, 1);
  assert.equal(buildingSummary([rows[0], rows[2]], now).default_floor_id, 2);
  assert.equal(buildingCards([...rows, row({ location_id: 2 })], now).length, 2);
});
