import assert from "node:assert/strict";
import test from "node:test";

import {
  clearAttemptKey,
  getAttemptKey,
  readAttemptKey,
  shouldClearVoucherUseKey,
  voucherUseAttemptScope,
} from "../src/features/rewards/api/attempt-keys.ts";

test("401 keeps the voucher use attempt key for recovery after sign-in", () => {
  assert.equal(shouldClearVoucherUseKey("unauthenticated"), false);
});

test("ok and unknown keep the key, conflict and rejected clear it", () => {
  assert.equal(shouldClearVoucherUseKey("ok"), false);
  assert.equal(shouldClearVoucherUseKey("unknown"), false);
  assert.equal(shouldClearVoucherUseKey("conflict"), true);
  assert.equal(shouldClearVoucherUseKey("rejected"), true);
});

test("a kept key is reused for the same voucher until cleared", () => {
  const scope = voucherUseAttemptScope(42);
  const key = getAttemptKey(scope);
  if (shouldClearVoucherUseKey("unauthenticated")) clearAttemptKey(scope);
  assert.equal(readAttemptKey(scope), key);
  assert.equal(getAttemptKey(scope), key);
  clearAttemptKey(scope);
  assert.equal(readAttemptKey(scope), null);
});
