import assert from "node:assert/strict";
import test from "node:test";

import {
  canStartSubmit,
  checkInFlowReducer,
  getErrorExit,
  gpsFailureReason,
  initialCheckInFlowState,
} from "../src/features/crowd-report/check-in-flow.ts";
import {
  classifyGeolocationError,
  requestGpsEvidence,
  toGpsResult,
} from "../src/features/crowd-report/location.ts";

const floor = {
  floorRef: "floor-1",
  context: { buildingName: "LX", floorLabel: "ชั้น 3", imageUrl: null },
};

const record = {
  buildingName: "LX",
  floorLabel: "ชั้น 3",
  level: 3,
  recordedAt: "2026-11-16T03:00:00.000Z",
};

function run(...actions) {
  return actions.reduce(checkInFlowReducer, initialCheckInFlowState);
}

const scanning = [{ type: "confirm_level", level: 3 }];
const resolving = [...scanning, { type: "resolve_start" }];
const ready = [
  ...resolving,
  { type: "resolve_done", result: { kind: "resolved", floor } },
];
const submitting = [...ready, { type: "submit_start" }];

test("confirming a level opens the scanner without a floor", () => {
  const state = run(...scanning);
  assert.equal(state.phase, "scan");
  assert.equal(state.level, 3);
  assert.equal(state.floor, null);
  assert.equal(state.submission.status, "idle");
});

test("scanning alone never starts a submission", () => {
  const state = run(...resolving);
  assert.equal(state.scan.status, "verifying");
  assert.equal(state.submission.status, "idle");
  assert.equal(canStartSubmit(state), false);
});

test("a resolved QR sends the server floor context to the form", () => {
  const state = run(...ready);
  assert.equal(state.phase, "ready");
  assert.deepEqual(state.floor, floor);
  assert.equal(state.formKey, 1);
  assert.equal(canStartSubmit(state), true);
});

test("a rejected QR stays on the scanner and can be rescanned", () => {
  const rejected = run(...resolving, {
    type: "resolve_done",
    result: { kind: "rejected", reason: "invalid_qr" },
  });
  assert.equal(rejected.phase, "scan");
  assert.deepEqual(rejected.scan, {
    status: "rejected",
    reason: "invalid_qr",
    message: undefined,
  });
  assert.equal(rejected.floor, null);
  assert.equal(
    checkInFlowReducer(rejected, { type: "rescan" }).scan.status,
    "idle",
  );
});

test("a duplicate detection while verifying is ignored", () => {
  const state = run(...resolving);
  assert.equal(checkInFlowReducer(state, { type: "resolve_start" }), state);
  assert.equal(checkInFlowReducer(state, { type: "rescan" }), state);
});

test("a late resolve after rescan or reset is ignored", () => {
  const late = { type: "resolve_done", result: { kind: "resolved", floor } };
  const rescanned = run(...scanning, { type: "rescan" });
  assert.equal(checkInFlowReducer(rescanned, late), rescanned);
  const reset = run(...resolving, { type: "reset" });
  assert.equal(checkInFlowReducer(reset, late), reset);
});

test("submit cannot start twice while pending", () => {
  const state = run(...submitting);
  assert.equal(state.submission.status, "pending");
  assert.equal(canStartSubmit(state), false);
  assert.equal(checkInFlowReducer(state, { type: "submit_start" }), state);
});

test("GPS failures map to the form GPS errors", () => {
  assert.equal(gpsFailureReason("denied"), "gps_denied");
  for (const failure of ["unavailable", "timeout", "inaccurate"]) {
    assert.equal(gpsFailureReason(failure), "gps_unavailable");
  }
  const state = run(...submitting, { type: "gps_failed", reason: "denied" });
  assert.deepEqual(state.submission, { status: "error", reason: "gps_denied" });
  assert.equal(canStartSubmit(state), true);
});

test("server results become the form submission", () => {
  const success = run(...submitting, {
    type: "submit_done",
    result: { kind: "recorded", record },
  });
  assert.deepEqual(success.submission, { status: "success", record });
  assert.equal(canStartSubmit(success), false);

  const cooldown = run(...submitting, {
    type: "submit_done",
    result: { kind: "rejected", reason: "cooldown", message: "รอถึง 10:30" },
  });
  assert.deepEqual(cooldown.submission, {
    status: "error",
    reason: "cooldown",
    message: "รอถึง 10:30",
  });
});

test("results arriving after reset are ignored", () => {
  const reset = run(...submitting, { type: "reset" });
  assert.equal(reset.phase, "select");
  assert.equal(reset.floor, null);
  const late = { type: "submit_done", result: { kind: "recorded", record } };
  assert.equal(checkInFlowReducer(reset, late), reset);
  assert.equal(
    checkInFlowReducer(reset, { type: "gps_failed", reason: "denied" }),
    reset,
  );
});

test("reset remounts the form with a new key", () => {
  const state = run(...ready, { type: "reset" });
  assert.equal(state.formKey, 2);
  assert.equal(state.level, null);
});

test("geolocation error codes are classified", () => {
  assert.equal(classifyGeolocationError(1), "denied");
  assert.equal(classifyGeolocationError(2), "unavailable");
  assert.equal(classifyGeolocationError(3), "timeout");
});

const position = (accuracy) => ({
  coords: { latitude: 13.73, longitude: 100.77, accuracy },
  timestamp: Date.parse("2026-11-16T03:00:00.000Z"),
});

test("positions above the accuracy limit are rejected", () => {
  assert.deepEqual(toGpsResult(position(150), 100), {
    kind: "failed",
    reason: "inaccurate",
  });
  assert.deepEqual(toGpsResult(position(20), 100), {
    kind: "ok",
    evidence: {
      latitude: 13.73,
      longitude: 100.77,
      accuracyMeters: 20,
      capturedAt: "2026-11-16T03:00:00.000Z",
    },
  });
});

const options = { timeoutMs: 50, maxAccuracyMeters: 100 };

test("requestGpsEvidence asks for a fresh high accuracy fix", async () => {
  let requested;
  const geolocation = {
    getCurrentPosition(success, _error, opts) {
      requested = opts;
      success(position(10));
    },
  };
  const result = await requestGpsEvidence(
    new AbortController().signal,
    options,
    geolocation,
  );
  assert.equal(result.kind, "ok");
  assert.deepEqual(requested, {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 50,
  });
});

test("requestGpsEvidence reports denial and missing support", async () => {
  const denied = {
    getCurrentPosition(_success, error) {
      error({ code: 1 });
    },
  };
  assert.deepEqual(
    await requestGpsEvidence(new AbortController().signal, options, denied),
    { kind: "failed", reason: "denied" },
  );
  assert.deepEqual(
    await requestGpsEvidence(new AbortController().signal, options, undefined),
    { kind: "failed", reason: "unavailable" },
  );
});

test("requestGpsEvidence times out when no fix arrives", async () => {
  const silent = { getCurrentPosition() {} };
  assert.deepEqual(
    await requestGpsEvidence(new AbortController().signal, options, silent),
    { kind: "failed", reason: "timeout" },
  );
});

test("requestGpsEvidence rejects when aborted and ignores late fixes", async () => {
  let deliver;
  const slow = {
    getCurrentPosition(success) {
      deliver = () => success(position(10));
    },
  };
  const controller = new AbortController();
  const pending = requestGpsEvidence(controller.signal, options, slow);
  controller.abort();
  deliver();
  await assert.rejects(pending, { name: "AbortError" });
});

test("non-retryable submit errors offer a way out", () => {
  assert.equal(
    getErrorExit({ status: "error", reason: "invalid_qr" }),
    "rescan",
  );
  assert.equal(getErrorExit({ status: "error", reason: "auth" }), "login");
  assert.equal(
    getErrorExit({ status: "error", reason: "cooldown" }),
    "restart",
  );
  assert.equal(getErrorExit({ status: "error", reason: "network" }), null);
  assert.equal(getErrorExit({ status: "idle" }), null);
});

test("scan again after an invalid QR returns to the scanner with the level", () => {
  const state = run(
    ...submitting,
    {
      type: "submit_done",
      result: { kind: "rejected", reason: "invalid_qr" },
    },
    { type: "scan_again" },
  );
  assert.equal(state.phase, "scan");
  assert.equal(state.level, 3);
  assert.equal(state.floor, null);
  assert.deepEqual(state.scan, { status: "idle" });
  assert.deepEqual(state.submission, { status: "idle" });
});

test("scan again is ignored unless a submit error is showing", () => {
  const readyState = run(...ready);
  assert.equal(
    checkInFlowReducer(readyState, { type: "scan_again" }),
    readyState,
  );
  const pending = run(...submitting);
  assert.equal(checkInFlowReducer(pending, { type: "scan_again" }), pending);
});
