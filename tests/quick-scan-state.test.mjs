import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyCameraError,
  createDetectionGate,
  getScannerView,
  stopMediaStream,
} from "../src/features/quick-scan/scanner-state.ts";

function domError(name) {
  return Object.assign(new Error(name), { name });
}

test("permission errors map to denied", () => {
  for (const name of [
    "NotAllowedError",
    "PermissionDeniedError",
    "SecurityError",
  ]) {
    assert.equal(classifyCameraError(domError(name)), "denied");
  }
});

test("missing or unsatisfiable cameras map to unavailable", () => {
  for (const name of [
    "NotFoundError",
    "DevicesNotFoundError",
    "OverconstrainedError",
    "ConstraintNotSatisfiedError",
  ]) {
    assert.equal(classifyCameraError(domError(name)), "unavailable");
  }
});

test("a missing camera API maps to unsupported", () => {
  assert.equal(
    classifyCameraError(domError("NotSupportedError")),
    "unsupported",
  );
});

test("stream start failures and unknown values map to error", () => {
  assert.equal(classifyCameraError(domError("NotReadableError")), "error");
  assert.equal(classifyCameraError(domError("AbortError")), "error");
  assert.equal(classifyCameraError("boom"), "error");
  assert.equal(classifyCameraError(null), "error");
});

test("loading states are busy and hide retry", () => {
  for (const status of ["idle", "requesting", "starting"]) {
    const view = getScannerView(status);
    assert.equal(view.busy, true);
    assert.equal(view.canRetry, false);
  }
  assert.equal(getScannerView("requesting").showPreview, false);
  assert.equal(getScannerView("starting").showPreview, true);
});

test("scanning and detected show the preview without retry", () => {
  for (const status of ["scanning", "detected"]) {
    const view = getScannerView(status);
    assert.equal(view.showPreview, true);
    assert.equal(view.busy, false);
    assert.equal(view.canRetry, false);
    assert.equal(view.tone, "neutral");
  }
});

test("denied, unavailable and error offer retry; unsupported does not", () => {
  for (const status of ["denied", "unavailable", "error"]) {
    const view = getScannerView(status);
    assert.equal(view.tone, "error");
    assert.equal(view.showPreview, false);
    assert.equal(view.canRetry, true);
  }
  const unsupported = getScannerView("unsupported");
  assert.equal(unsupported.tone, "error");
  assert.equal(unsupported.canRetry, false);
});

test("detection gate accepts only the first non-empty value per round", () => {
  const gate = createDetectionGate();
  assert.equal(gate.settled, false);
  assert.equal(gate.accept(""), false);
  assert.equal(gate.settled, false);
  assert.equal(gate.accept("floor-qr-1"), true);
  assert.equal(gate.settled, true);
  assert.equal(gate.accept("floor-qr-1"), false);
  assert.equal(gate.accept("floor-qr-2"), false);

  gate.reset();
  assert.equal(gate.settled, false);
  assert.equal(gate.accept("floor-qr-2"), true);
});

test("stopMediaStream stops every track and tolerates missing streams", () => {
  const stopped = [];
  const stream = {
    getTracks: () => [
      { stop: () => stopped.push("video") },
      { stop: () => stopped.push("audio") },
    ],
  };
  stopMediaStream(stream);
  assert.deepEqual(stopped, ["video", "audio"]);
  assert.doesNotThrow(() => stopMediaStream(null));
  assert.doesNotThrow(() => stopMediaStream(undefined));
});
