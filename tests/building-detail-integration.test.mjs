import assert from "node:assert/strict";
import test from "node:test";

import {
  formatBuildingHoursLabel,
  formatCrowdTimestampLines,
  formatFloorHoursValue,
  toOpeningHours,
} from "../src/features/locations/api/availability-display.ts";
import {
  buildBuildingDetailHref,
  withFloorQuery,
  loadBuildingDetail,
  loadFloorDetail,
  mergeSingleFloorDetail,
  parseBuildingIdParam,
  resolveInitialFloorId,
  toBuildingDetailModel,
} from "../src/features/locations/components/building-detail-adapter.ts";

test("parseBuildingIdParam accepts valid positive 32-bit integers only", () => {
  assert.equal(parseBuildingIdParam("31"), 31);
  assert.equal(parseBuildingIdParam("2147483647"), 2147483647);
  assert.equal(parseBuildingIdParam("0"), null);
  assert.equal(parseBuildingIdParam("-1"), null);
  assert.equal(parseBuildingIdParam("abc"), null);
  assert.equal(parseBuildingIdParam("031"), null);
  assert.equal(parseBuildingIdParam("2147483648"), null);
});

test("toBuildingDetailModel separates building hours, floor hours, timestamps and unknown crowd", () => {
  const { building, defaultFloorId } = toBuildingDetailModel(
    {
      id: 31,
      building: "N16",
      name: "อาคารการเรียนรู้พหุวิทยาการ",
      category: ["อาคารเรียน"],
      aliases: ["LX"],
      image_url: null,
      details: { description: "อาคารเรียนรวม LX" },
      availability: {
        status: "open",
        today_intervals: [{ open_time: "08:00:00", close_time: "22:00:00" }],
        display_hours: "08:00:00–22:00:00",
      },
      floors: [
        {
          id: 190,
          floor_name: "1",
          capacity: 120,
          hours: [
            {
              day_of_week: 1,
              open_time: "08:00:00",
              close_time: "17:00:00",
              is_active: true,
            },
          ],
          availability: {
            status: "open",
            today_intervals: [
              { open_time: "08:00:00", close_time: "12:00:00" },
              { open_time: "13:00:00", close_time: "17:00:00" },
            ],
            display_hours: "08:00:00–12:00:00, 13:00:00–17:00:00",
          },
        },
        {
          id: 191,
          floor_name: "2",
          capacity: null,
          availability: {
            status: "unknown",
            today_intervals: [],
            display_hours: null,
          },
        },
      ],
    },
    {
      default_floor_id: 190,
      floors: [
        {
          floor_id: 190,
          floor_name: "1",
          capacity: 120,
          status: "ready",
          estimated_people: 24,
          report_count: 24,
          current_crowd_level: 3.1,
          level: "medium",
          density_percent: 20,
          latest_report_at: "2026-11-19T05:10:00.000Z",
          calculated_at: "2026-11-19T05:20:00.000Z",
          window_start: "2026-11-19T04:50:00.000Z",
        },
        {
          floor_id: 191,
          floor_name: "2",
          capacity: null,
          status: "unknown",
          estimated_people: 0,
          report_count: 0,
          current_crowd_level: null,
          level: null,
          density_percent: null,
          latest_report_at: null,
          calculated_at: "2026-11-19T05:20:00.000Z",
          window_start: "2026-11-19T04:50:00.000Z",
        },
      ],
    },
  );

  assert.equal(defaultFloorId, "190");
  assert.equal(building.description, "อาคารเรียนรวม LX");
  assert.deepEqual(building.aliases, ["LX"]);
  assert.equal(
    formatBuildingHoursLabel(building.availability),
    "เวลาเปิดอาคาร (อย่างน้อย 1 ชั้น): 08:00 - 22:00",
  );

  assert.equal(
    formatFloorHoursValue(building.floors[0].openingHours),
    "08:00 - 12:00, 13:00 - 17:00",
  );
  assert.deepEqual(building.floors[0].details, [
    { label: "ความจุชั้น", value: "120 คน" },
    { label: "วันจันทร์", value: "08:00 - 17:00" },
  ]);
  assert.deepEqual(building.floors[0].crowdMeta, {
    status: "ready",
    latestReportAt: "2026-11-19T05:10:00.000Z",
    calculatedAt: "2026-11-19T05:20:00.000Z",
  });

  // Floor 2 has unknown crowd (report_count = 0) & unknown schedule -> never 0/คนน้อย or 00:00 - 23:59
  assert.equal(building.floors[1].openingHours, null);
  assert.equal(
    formatFloorHoursValue(building.floors[1].openingHours),
    "ไม่ทราบเวลาเปิด",
  );
  assert.equal(building.floors[1].crowd.status, "ready");
  if (building.floors[1].crowd.status === "ready") {
    assert.equal(building.floors[1].crowd.level, null);
    assert.equal(building.floors[1].crowd.estimatedPeople, null);
    assert.equal(building.floors[1].crowd.densityPercent, null);
  }
  const unknownTimestamps = formatCrowdTimestampLines(
    building.floors[1].crowdMeta,
  );
  assert.equal(
    unknownTimestamps?.reportText,
    "รายงานล่าสุด ไม่มีใน 30 นาทีนี้",
  );
  assert.equal(unknownTimestamps?.calculatedText, "คำนวณรอบล่าสุด 12:20 น.");

  const readyTimestamps = formatCrowdTimestampLines(
    building.floors[0].crowdMeta,
  );
  assert.equal(readyTimestamps?.reportText, "รายงานล่าสุด 12:10 น.");
  assert.equal(readyTimestamps?.calculatedText, "คำนวณรอบล่าสุด 12:20 น.");
});

test("toOpeningHours handles closed and unknown schedules without returning fake 24h hours", () => {
  assert.equal(
    toOpeningHours({ status: "closed", today_intervals: [] }),
    "closed",
  );
  assert.equal(
    toOpeningHours({ status: "unknown", today_intervals: [] }),
    null,
  );
  assert.equal(formatFloorHoursValue(null), "ไม่ทราบเวลาเปิด");
  assert.equal(formatFloorHoursValue("closed"), "ปิดวันนี้");
});

test("mergeSingleFloorDetail updates the selected floor cleanly", () => {
  const { building } = toBuildingDetailModel(
    {
      id: 31,
      building: "N16",
      name: "LX",
      image_url: null,
      floors: [
        {
          id: 190,
          floor_name: "1",
          capacity: 100,
          availability: { status: "open", today_intervals: [] },
        },
      ],
    },
    undefined,
  );

  const updated = mergeSingleFloorDetail(
    building,
    {
      id: 190,
      floor_name: "1",
      capacity: 150,
      availability: {
        status: "open",
        today_intervals: [{ open_time: "08:30:00", close_time: "16:30:00" }],
      },
    },
    {
      floor_id: 190,
      floor_name: "1",
      capacity: 150,
      status: "ready",
      estimated_people: 10,
      report_count: 10,
      current_crowd_level: 1.8,
      level: "low",
      density_percent: 6.7,
      latest_report_at: "2026-11-19T05:00:00.000Z",
      calculated_at: "2026-11-19T05:10:00.000Z",
      window_start: "2026-11-19T04:40:00.000Z",
    },
    false,
  );

  assert.equal(formatFloorHoursValue(updated.floors[0].openingHours), "08:30 - 16:30");
  assert.deepEqual(updated.floors[0].details, [
    { label: "ความจุชั้น", value: "150 คน" },
  ]);
  if (updated.floors[0].crowd.status === "ready") {
    assert.equal(updated.floors[0].crowd.level, "low");
    assert.equal(updated.floors[0].crowd.densityPercent, 6.7);
  }
});

test("loadBuildingDetail and loadFloorDetail map 404, 503 and partial crowd failures accurately", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  // Invalid ID skips fetch
  assert.deepEqual(await loadBuildingDetail("invalid"), { kind: "not_found" });

  // 404 location -> not_found
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ success: false, code: "not_found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  assert.deepEqual(await loadBuildingDetail("999"), { kind: "not_found" });

  // 503 location -> error
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ success: false, code: "unavailable" }), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  assert.deepEqual(await loadBuildingDetail("31"), { kind: "error" });

  // Active building with 0 active floors (locations 200 floors:[], crowd 404)
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url === "/api/locations/31") {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: 31,
            building: "N16",
            name: "LX",
            image_url: null,
            floors: [],
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    return new Response(JSON.stringify({ success: false, code: "not_found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  };
  const emptyFloorsOutcome = await loadBuildingDetail("31");
  assert.equal(emptyFloorsOutcome.kind, "ok");
  if (emptyFloorsOutcome.kind === "ok") {
    assert.deepEqual(emptyFloorsOutcome.building.floors, []);
  }

  // Floor refresh with crowd 503 keeps floor schedule and marks crowd error
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url === "/api/locations/31/floors/190") {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: 190,
            floor_name: "1",
            capacity: 50,
            availability: { status: "closed", today_intervals: [] },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    return new Response(JSON.stringify({ success: false, code: "unavailable" }), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  };
  const floorOutcome = await loadFloorDetail("31", "190");
  assert.equal(floorOutcome.kind, "ok");
  if (floorOutcome.kind === "ok") {
    assert.equal(floorOutcome.crowdFailed, true);
    assert.equal(floorOutcome.floor.id, 190);
  }
});

test("buildBuildingDetailHref preserves home and locations queries and attaches floor when provided", () => {
  assert.equal(
    buildBuildingDetailHref("31", {
      floorId: "192",
      baseQuery: "q=lib&level=low&building=31&from=home",
    }),
    "/locations/31?q=lib&level=low&building=31&from=home&floor=192",
  );

  assert.equal(
    buildBuildingDetailHref("31", {
      floorId: "195",
      baseQuery: "?q=sc&level=medium",
    }),
    "/locations/31?q=sc&level=medium&floor=195",
  );

  assert.equal(
    buildBuildingDetailHref("31", {
      baseQuery: "?q=sc&floor=190",
    }),
    "/locations/31?q=sc",
  );

  assert.equal(buildBuildingDetailHref("31"), "/locations/31");
});

test("resolveInitialFloorId returns matching requested floor or falls back to defaultFloorId", () => {
  const floors = [{ id: "190" }, { id: "191" }, { id: "192" }];

  assert.equal(resolveInitialFloorId(floors, "192", "190"), "192");
  assert.equal(resolveInitialFloorId(floors, " 191 ", "190"), "191");
  assert.equal(resolveInitialFloorId(floors, "999", "190"), "190");
  assert.equal(resolveInitialFloorId(floors, null, "190"), "190");
  assert.equal(resolveInitialFloorId(floors, undefined, undefined), undefined);
});

test("withFloorQuery sets the selected floor and keeps the other detail query values", () => {
  assert.equal(withFloorQuery("?from=home&building=1&floor=1", "2"), "from=home&building=1&floor=2");
  assert.equal(withFloorQuery("", "3"), "floor=3");
  assert.equal(withFloorQuery("?q=S1&level=medium", "4"), "q=S1&level=medium&floor=4");
});
