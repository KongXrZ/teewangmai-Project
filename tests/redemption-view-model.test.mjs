import assert from "node:assert/strict";
import test from "node:test";

import {
  getCloseReason,
  getRedemptionView,
} from "../src/features/rewards/redemption.ts";

test("idle shows the confirm step and allows confirm and dismiss", () => {
  assert.deepEqual(getRedemptionView({ status: "idle" }), {
    step: "confirm",
    pending: false,
    canDismiss: true,
    canConfirm: true,
    canRetry: false,
  });
});

test("pending stays on confirm and locks confirm, retry and dismiss", () => {
  assert.deepEqual(getRedemptionView({ status: "pending" }), {
    step: "confirm",
    pending: true,
    canDismiss: false,
    canConfirm: false,
    canRetry: false,
  });
});

test("each explicit result maps to its own step without confirm", () => {
  for (const status of [
    "insufficient_points",
    "unavailable",
    "failure",
    "success",
  ]) {
    const view = getRedemptionView({ status });
    assert.equal(view.step, status);
    assert.equal(view.canConfirm, false);
    assert.equal(view.canDismiss, true);
  }
});

test("only failure can retry, unless the server marks it non-retryable", () => {
  assert.equal(getRedemptionView({ status: "failure" }).canRetry, true);
  assert.equal(
    getRedemptionView({ status: "failure", retryable: false }).canRetry,
    false,
  );
  assert.equal(getRedemptionView({ status: "unavailable" }).canRetry, false);
  assert.equal(
    getRedemptionView({ status: "insufficient_points" }).canRetry,
    false,
  );
  assert.equal(getRedemptionView({ status: "success" }).canRetry, false);
});

test("close reason is done only after a confirmed success", () => {
  assert.equal(getCloseReason({ status: "success" }), "done");
  for (const status of [
    "idle",
    "insufficient_points",
    "unavailable",
    "failure",
  ]) {
    assert.equal(getCloseReason({ status }), "cancel");
  }
});
