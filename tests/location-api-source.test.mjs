import assert from "node:assert/strict";
import test from "node:test";

import { createLocationApiSource } from "../src/features/locations/components/location-api-source.ts";

const openAvailability = {
  status: "open",
  today_intervals: [{ open_time: "08:00:00", close_time: "17:00:00" }],
  display_hours: "08:00:00–17:00:00",
};

const makeBuilding = (id, code, name) => ({
  id,
  building: code,
  name,
  image_url: null,
  availability: openAvailability,
});

const makeCrowdBuilding = (locationId, level, latestReportAt) => ({
  location_id: locationId,
  default_floor_id: locationId * 10 + 1,
  busiest_floor: {
    floor_id: locationId * 10 + 1,
    floor_name: "1",
    capacity: 100,
    status: level ? "ready" : "unknown",
    estimated_people: level ? 12 : 0,
    report_count: level ? 12 : 0,
    current_crowd_level: level === "high" ? 4.2 : level === "low" ? 1.5 : null,
    level,
    density_percent: level ? 12 : null,
    latest_report_at: latestReportAt,
    calculated_at: "2026-11-20T10:00:00.000Z",
    window_start: "2026-11-20T09:30:00.000Z",
  },
});

test("listBuildings merges live crowd summaries onto building cards", async () => {
  const source = createLocationApiSource(async (url) => {
    if (String(url).startsWith("/api/locations?")) {
      return new Response(
        JSON.stringify({
          success: true,
          data: [makeBuilding(1, "N7", "อาคารเรียนรวม 2"), makeBuilding(2, "N16", "LX")],
          pagination: { page: 1, total: 2, total_pages: 1 },
        }),
        { status: 200 },
      );
    }
    if (url === "/api/crowd/locations") {
      return new Response(
        JSON.stringify({
          success: true,
          data: [
            makeCrowdBuilding(1, "high", "2026-11-20T09:55:00.000Z"),
            makeCrowdBuilding(2, null, null),
          ],
        }),
        { status: 200 },
      );
    }
    throw new Error(`Unexpected URL: ${url}`);
  });

  assert.equal(source.supportsCrowdFilter, true);
  const page = await source.listBuildings(
    { search: "", crowdLevel: null, cursor: null },
    new AbortController().signal,
  );
  assert.equal(page.totalCount, 2);
  assert.equal(page.nextCursor, null);
  assert.equal(page.buildings[0].crowdLevel, "high");
  assert.equal(page.buildings[0].latestReportAt, "2026-11-20T09:55:00.000Z");
  assert.equal(page.buildings[1].crowdLevel, null);
  assert.equal(page.buildings[1].crowdStatus, "unknown");
});

test("listBuildings filters across all pages accurately when crowdLevel is set", async () => {
  const source = createLocationApiSource(async (url) => {
    if (String(url).includes("page=1")) {
      return new Response(
        JSON.stringify({
          success: true,
          data: [makeBuilding(1, "N7", "อาคารเรียนรวม 2")],
          pagination: { page: 1, total: 2, total_pages: 2 },
        }),
        { status: 200 },
      );
    }
    if (String(url).includes("page=2")) {
      return new Response(
        JSON.stringify({
          success: true,
          data: [makeBuilding(2, "N16", "LX")],
          pagination: { page: 2, total: 2, total_pages: 2 },
        }),
        { status: 200 },
      );
    }
    if (url === "/api/crowd/locations") {
      return new Response(
        JSON.stringify({
          success: true,
          data: [
            makeCrowdBuilding(1, "low", "2026-11-20T09:55:00.000Z"),
            makeCrowdBuilding(2, "high", "2026-11-20T09:58:00.000Z"),
          ],
        }),
        { status: 200 },
      );
    }
    throw new Error(`Unexpected URL: ${url}`);
  });

  const page = await source.listBuildings(
    { search: "", crowdLevel: "high", cursor: null },
    new AbortController().signal,
  );
  assert.equal(page.totalCount, 1);
  assert.equal(page.nextCursor, null);
  assert.deepEqual(
    page.buildings.map((b) => b.code),
    ["N16"],
  );
});

test("listBuildings falls back gracefully when crowd API fails without filter, and rejects when filtered", async () => {
  const source = createLocationApiSource(async (url) => {
    if (String(url).startsWith("/api/locations")) {
      return new Response(
        JSON.stringify({
          success: true,
          data: [makeBuilding(1, "N7", "อาคารเรียนรวม 2")],
          pagination: { page: 1, total: 1, total_pages: 1 },
        }),
        { status: 200 },
      );
    }
    if (url === "/api/crowd/locations") {
      return new Response(JSON.stringify({ success: false }), { status: 503 });
    }
    throw new Error(`Unexpected URL: ${url}`);
  });

  const unfiltered = await source.listBuildings(
    { search: "", crowdLevel: null, cursor: null },
    new AbortController().signal,
  );
  assert.equal(unfiltered.buildings.length, 1);
  assert.equal(unfiltered.buildings[0].crowdLevel, null);

  await assert.rejects(
    source.listBuildings(
      { search: "", crowdLevel: "low", cursor: null },
      new AbortController().signal,
    ),
    /Crowd summary API unavailable/,
  );
});

test("loadBuildingFloors merges floor crowd stats and handles crowd API failure", async () => {
  const okSource = createLocationApiSource(async (url) => {
    if (url === "/api/locations/7") {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            availability: openAvailability,
            floors: [
              { id: 71, floor_name: "1", capacity: 100, availability: openAvailability },
            ],
          },
        }),
        { status: 200 },
      );
    }
    if (url === "/api/crowd/locations/7") {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            default_floor_id: 71,
            floors: [
              {
                floor_id: 71,
                floor_name: "1",
                capacity: 100,
                status: "ready",
                estimated_people: 8,
                report_count: 8,
                current_crowd_level: 2.0,
                level: "low",
                density_percent: 8,
                latest_report_at: "2026-11-20T09:50:00.000Z",
                calculated_at: "2026-11-20T10:00:00.000Z",
                window_start: "2026-11-20T09:30:00.000Z",
              },
            ],
          },
        }),
        { status: 200 },
      );
    }
    throw new Error(`Unexpected URL: ${url}`);
  });

  const okFloors = await okSource.loadBuildingFloors("7", new AbortController().signal);
  assert.equal(okFloors.defaultFloorId, "71");
  assert.equal(okFloors.buildingAvailability?.status, "open");
  assert.deepEqual(okFloors.floors[0].crowd, {
    status: "ready",
    level: "low",
    updatedAt: "2026-11-20T09:50:00.000Z",
    estimatedPeople: 8,
    densityPercent: 8,
  });

  const failedCrowdSource = createLocationApiSource(async (url) => {
    if (url === "/api/locations/7") {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            availability: openAvailability,
            floors: [
              { id: 71, floor_name: "1", capacity: 100, availability: openAvailability },
            ],
          },
        }),
        { status: 200 },
      );
    }
    return new Response(JSON.stringify({ success: false }), { status: 503 });
  });

  const degraded = await failedCrowdSource.loadBuildingFloors(
    "7",
    new AbortController().signal,
  );
  assert.deepEqual(degraded.floors[0].crowd, { status: "error" });
});
