import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHomeQueryString,
  findConfirmedSearchBuilding,
  mergeBuildingFloors,
  mergeBuildingWithCrowd,
  parseCrowdFilterParam,
  resolveMapSearch,
  toCrowdBuildingMap,
} from "../src/features/campus-map/map-api-adapter.ts";

test("mergeBuildingWithCrowd uses BE-006 busiest_floor summary when ready and treats unknown/stale/pending as null", () => {
  const crowdMap = toCrowdBuildingMap([
    {
      location_id: 31,
      default_floor_id: 190,
      busiest_floor: {
        floor_id: 190,
        floor_name: "1",
        capacity: 120,
        status: "ready",
        estimated_people: 24,
        report_count: 24,
        current_crowd_level: 4.5,
        level: "high",
        density_percent: 20,
        latest_report_at: "2026-11-17T10:15:00.000Z",
        calculated_at: "2026-11-17T10:20:00.000Z",
        window_start: "2026-11-17T09:50:00.000Z",
      },
    },
    {
      location_id: 17,
      default_floor_id: 114,
      busiest_floor: {
        floor_id: 114,
        floor_name: "1",
        capacity: 80,
        status: "stale",
        estimated_people: null,
        report_count: null,
        current_crowd_level: null,
        level: null,
        density_percent: null,
        latest_report_at: null,
        calculated_at: "2026-11-17T09:00:00.000Z",
        window_start: "2026-11-17T08:30:00.000Z",
      },
    },
  ]);

  const readyBuilding = mergeBuildingWithCrowd(
    {
      id: 31,
      building: "N16",
      name: "อาคารการเรียนรู้พหุวิทยาการ",
      image_url: "https://example.com/n16.jpg",
    },
    crowdMap.get("31"),
  );
  assert.equal(readyBuilding.id, "31");
  assert.equal(readyBuilding.code, "N16");
  assert.equal(readyBuilding.crowdLevel, "high");
  assert.equal(readyBuilding.updatedAt, "2026-11-17T10:15:00.000Z");
  assert.equal(readyBuilding.defaultFloorId, "190");
  assert.equal(readyBuilding.crowdStatus, "ready");
  assert.equal(readyBuilding.isActive, true);

  const staleBuilding = mergeBuildingWithCrowd(
    {
      id: 17,
      building: "N2",
      name: "อาคารสำนักงานอธิการบดี",
      image_url: null,
    },
    crowdMap.get("17"),
  );
  assert.equal(staleBuilding.crowdLevel, null);
  assert.equal(staleBuilding.updatedAt, null);
  assert.equal(staleBuilding.crowdStatus, "stale");

  const missingCrowdBuilding = mergeBuildingWithCrowd({
    id: 14,
    building: "S14",
    name: "อาคาร 190 ปี",
    image_url: null,
  });
  assert.equal(missingCrowdBuilding.crowdLevel, null);
  assert.equal(missingCrowdBuilding.crowdStatus, "unknown");
});

test("mergeBuildingFloors aligns floor hours with crowd summaries and handles crowd failure", () => {
  const catalogFloors = [
    {
      id: 190,
      floor_name: "1",
      availability: {
        status: "open",
        today_intervals: [{ open_time: "08:00:00", close_time: "17:00:00" }],
      },
    },
    {
      id: 191,
      floor_name: "2",
      availability: {
        status: "closed",
        today_intervals: [],
      },
    },
  ];

  const crowdFloors = [
    {
      floor_id: 190,
      floor_name: "1",
      capacity: 100,
      status: "ready",
      estimated_people: 12,
      report_count: 12,
      current_crowd_level: 1.5,
      level: "low",
      density_percent: 12,
      latest_report_at: "2026-11-17T10:12:00.000Z",
      calculated_at: "2026-11-17T10:20:00.000Z",
      window_start: "2026-11-17T09:50:00.000Z",
    },
    {
      floor_id: 191,
      floor_name: "2",
      capacity: 100,
      status: "unknown",
      estimated_people: 0,
      report_count: 0,
      current_crowd_level: null,
      level: null,
      density_percent: null,
      latest_report_at: null,
      calculated_at: "2026-11-17T10:20:00.000Z",
      window_start: "2026-11-17T09:50:00.000Z",
    },
  ];

  const merged = mergeBuildingFloors(catalogFloors, crowdFloors);
  assert.equal(merged.length, 2);
  assert.deepEqual(merged[0].openingHours, {
    open: "08:00:00",
    close: "17:00:00",
  });
  assert.deepEqual(merged[0].crowd, {
    status: "ready",
    level: "low",
    updatedAt: "2026-11-17T10:12:00.000Z",
    estimatedPeople: 12,
    densityPercent: 12,
  });

  assert.equal(merged[1].openingHours, "closed");
  assert.deepEqual(merged[1].crowd, {
    status: "ready",
    level: null,
    updatedAt: null,
    estimatedPeople: null,
    densityPercent: null,
  });

  const withCrowdError = mergeBuildingFloors(catalogFloors, undefined, true);
  assert.deepEqual(withCrowdError[0].crowd, { status: "error" });
  assert.deepEqual(withCrowdError[1].crowd, { status: "error" });
});

test("resolveMapSearch distinguishes exact matches from partial/alias matches and respects crowdFilter", () => {
  const n16 = {
    id: "31",
    code: "N16",
    name: "อาคารการเรียนรู้พหุวิทยาการ",
    imageUrl: null,
    crowdLevel: "high",
    updatedAt: null,
  };
  const n17 = {
    id: "32",
    code: "N17",
    name: "อาคารเรียนรวม 2",
    imageUrl: null,
    crowdLevel: "medium",
    updatedAt: null,
  };

  assert.deepEqual(resolveMapSearch("  ", [n16, n17], "all"), {
    filteredResults: [],
    highlightedBuildingIds: [],
    exactMatchBuilding: null,
  });

  const exactCode = resolveMapSearch(" n16 ", [n16], "all");
  assert.equal(exactCode.exactMatchBuilding?.id, "31");
  assert.deepEqual(exactCode.highlightedBuildingIds, ["31"]);

  const aliasMatch = resolveMapSearch("LX", [n16], "all");
  assert.equal(aliasMatch.exactMatchBuilding, null);
  assert.deepEqual(aliasMatch.highlightedBuildingIds, ["31"]);

  const nearbyMulti = resolveMapSearch("N1", [n16, n17], "all");
  assert.equal(nearbyMulti.exactMatchBuilding, null);
  assert.deepEqual(nearbyMulti.highlightedBuildingIds, ["31", "32"]);

  const filteredSearch = resolveMapSearch("N1", [n16, n17], "medium");
  assert.deepEqual(filteredSearch.highlightedBuildingIds, ["32"]);
  assert.equal(filteredSearch.filteredResults.length, 1);
});

test("parseCrowdFilterParam and buildHomeQueryString preserve valid home and detail context", () => {
  assert.equal(parseCrowdFilterParam("low"), "low");
  assert.equal(parseCrowdFilterParam("medium"), "medium");
  assert.equal(parseCrowdFilterParam("high"), "high");
  assert.equal(parseCrowdFilterParam("invalid"), "all");
  assert.equal(parseCrowdFilterParam(null), "all");

  assert.equal(
    buildHomeQueryString({
      search: " N16 ",
      crowdFilter: "high",
      selectedBuildingId: "31",
      includeFromHome: true,
    }),
    "from=home&q=N16&level=high&building=31",
  );

  assert.equal(
    buildHomeQueryString({
      search: "",
      crowdFilter: "all",
      selectedBuildingId: null,
    }),
    "",
  );
});

test("findConfirmedSearchBuilding confirms exact code/name among prefix matches or a single result", () => {
  const s1 = {
    id: "1",
    code: "S1",
    name: "อาคารวิศวกรรมศาสตร์",
    imageUrl: null,
    crowdLevel: "low",
    updatedAt: null,
  };
  const s10 = {
    id: "10",
    code: "S10",
    name: "อาคารวิศวกรรมเคมี",
    imageUrl: null,
    crowdLevel: "medium",
    updatedAt: null,
  };
  const s11 = {
    id: "11",
    code: "S11",
    name: "อาคารปฏิบัติการรวม",
    imageUrl: null,
    crowdLevel: "high",
    updatedAt: null,
  };

  assert.equal(findConfirmedSearchBuilding(" s1 ", [s10, s1, s11])?.id, "1");
  assert.equal(
    findConfirmedSearchBuilding("อาคารวิศวกรรมเคมี", [s1, s10])?.id,
    "10",
  );
  assert.equal(findConfirmedSearchBuilding("ปฏิบัติการ", [s11])?.id, "11");
  assert.equal(findConfirmedSearchBuilding("อาคาร", [s1, s10, s11]), null);
  assert.equal(findConfirmedSearchBuilding("  ", [s1]), null);
});
