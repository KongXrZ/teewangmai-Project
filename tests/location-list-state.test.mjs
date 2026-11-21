import assert from "node:assert/strict";
import test from "node:test";

import { toLocationListState } from "../src/features/locations/components/location-list-state.ts";

const key = (crowdFilter, search) => JSON.stringify([crowdFilter, search]);

const building = { id: "1", code: "N7", name: "อาคาร N7" };

const page = (buildings, totalCount = buildings.length) => ({
  buildings,
  nextCursor: null,
  totalCount,
});

test("shows loading before the first list response", () => {
  assert.deepEqual(
    toLocationListState({
      filterUnavailable: false,
      listResult: undefined,
      listKey: key("all", ""),
    }),
    { status: "loading" },
  );
});

test("shows loading instead of stale results while a new filter request is in flight", () => {
  assert.deepEqual(
    toLocationListState({
      filterUnavailable: false,
      listResult: { key: key("all", ""), page: page([building], 12) },
      listKey: key("high", ""),
    }),
    { status: "loading" },
  );
});

test("shows loading instead of stale results while a new search request is in flight", () => {
  assert.deepEqual(
    toLocationListState({
      filterUnavailable: false,
      listResult: { key: key("all", ""), page: page([building]) },
      listKey: key("all", "N7"),
    }),
    { status: "loading" },
  );
});

test("does not show a previous request error for a new query", () => {
  assert.deepEqual(
    toLocationListState({
      filterUnavailable: false,
      listResult: { key: key("all", ""), page: null },
      listKey: key("all", "N7"),
    }),
    { status: "loading" },
  );
});

test("shows error when the current request fails", () => {
  assert.deepEqual(
    toLocationListState({
      filterUnavailable: false,
      listResult: { key: key("low", "N7"), page: null },
      listKey: key("low", "N7"),
    }),
    { status: "error" },
  );
});

test("shows ready results for the current request", () => {
  assert.deepEqual(
    toLocationListState({
      filterUnavailable: false,
      listResult: { key: key("all", "N7"), page: page([building], 5) },
      listKey: key("all", "N7"),
    }),
    { status: "ready", buildings: [building], totalCount: 5 },
  );
});

test("shows empty ready results for an active filter", () => {
  assert.deepEqual(
    toLocationListState({
      filterUnavailable: false,
      listResult: { key: key("high", "zzz"), page: page([]) },
      listKey: key("high", "zzz"),
    }),
    { status: "ready", buildings: [], totalCount: 0 },
  );
});

test("shows unavailable when the crowd filter is not supported", () => {
  assert.deepEqual(
    toLocationListState({
      filterUnavailable: true,
      listResult: { key: key("high", ""), page: page([building]) },
      listKey: key("high", ""),
    }),
    { status: "unavailable" },
  );
});
