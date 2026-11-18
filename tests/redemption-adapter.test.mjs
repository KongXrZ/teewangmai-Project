import assert from "node:assert/strict";
import test from "node:test";

import {
  fetchVouchers,
  parseRedeemResponse,
  parseVoucherUseResponse,
  parseVouchersResponse,
  redeemReward,
  requestVoucherUse,
  toRedemptionResult,
} from "../src/features/rewards/api/redemption-adapter.ts";
import {
  clearAttemptKey,
  getAttemptKey,
  readAttemptKey,
} from "../src/features/rewards/api/attempt-keys.ts";

const key = "6f1c2a52-7f43-4a55-9d3e-0a4f3c6f2b11";
const useCode = "0123456789abcdef0123456789abcdef";
const redeemed = {
  success: true,
  data: {
    replayed: false,
    points: 70,
    voucher: {
      id: 9,
      reward_id: 1,
      used_points: 50,
      redeemed_at: "2026-11-18T03:00:00Z",
      expires_at: "2026-11-25T03:00:00Z",
    },
  },
};
const voucher = {
  id: 9,
  reward_id: 1,
  title: "กาแฟ",
  image_url: null,
  used_points: 50,
  redeemed_at: "2026-11-18T03:00:00Z",
  expires_at: "2026-11-25T03:00:00Z",
  used_at: null,
  status: "available",
};

test("redeem sends only the reward id and idempotency key", async () => {
  const result = await redeemReward(1, key, async (url, init) => {
    assert.equal(url, "/api/rewards/1/redeem");
    assert.equal(init.method, "POST");
    assert.equal(init.headers["Idempotency-Key"], key);
    assert.equal(init.body, undefined);
    return Response.json(redeemed);
  });
  assert.deepEqual(result, { kind: "ok", voucherId: 9, points: 70 });
});

test("a replayed redemption is the same confirmed success", () => {
  const replayed = { ...redeemed, data: { ...redeemed.data, replayed: true } };
  assert.equal(parseRedeemResponse(200, replayed).kind, "ok");
});

test("success needs a confirmed voucher from the server", () => {
  for (const body of [{ success: true, data: {} }, { success: false }, null]) {
    const result = parseRedeemResponse(200, body);
    assert.equal(result.kind, "unknown");
    assert.equal(toRedemptionResult(result).status, "failure");
  }
});

test("server rejections map to their dialog result", () => {
  assert.deepEqual(
    toRedemptionResult(
      parseRedeemResponse(409, {
        code: "insufficient_points",
        error: "แต้มไม่พอสำหรับรางวัลนี้",
      }),
    ),
    { status: "insufficient_points", message: "แต้มไม่พอสำหรับรางวัลนี้" },
  );
  for (const code of [
    "out_of_stock",
    "limit_reached",
    "upcoming",
    "expired",
    "not_found",
  ]) {
    const status = code === "not_found" ? 404 : 409;
    assert.equal(
      toRedemptionResult(parseRedeemResponse(status, { code })).status,
      "unavailable",
    );
  }
});

test("only an unknown outcome stays retryable with the same key", async () => {
  const offline = await redeemReward(1, key, async () => {
    throw new TypeError("offline");
  });
  assert.equal(offline.kind, "unknown");
  assert.equal(toRedemptionResult(offline).retryable, true);
  assert.equal(parseRedeemResponse(503, { code: "unavailable" }).kind, "unknown");

  const conflict = parseRedeemResponse(422, { code: "key_conflict" });
  assert.equal(conflict.kind, "rejected");
  assert.equal(toRedemptionResult(conflict).retryable, false);
});

test("an aborted request is rethrown so its result can be skipped", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    redeemReward(
      1,
      key,
      async () => {
        throw new DOMException("aborted", "AbortError");
      },
      controller.signal,
    ),
  );
});

test("401 maps to unauthenticated on every call", () => {
  assert.equal(parseRedeemResponse(401, null).kind, "unauthenticated");
  assert.equal(parseVouchersResponse(401, null).kind, "unauthenticated");
  assert.equal(parseVoucherUseResponse(401, null).kind, "unauthenticated");
});

test("vouchers keep the server dates and status", () => {
  const used = { ...voucher, used_at: "2026-11-18T04:00:00Z", status: "used" };
  assert.deepEqual(
    parseVouchersResponse(200, { success: true, data: [used] }),
    {
      kind: "ok",
      vouchers: [
        {
          id: 9,
          title: "กาแฟ",
          imageUrl: null,
          usedPoints: 50,
          redeemedAt: "2026-11-18T03:00:00Z",
          expiresAt: "2026-11-25T03:00:00Z",
          usedAt: "2026-11-18T04:00:00Z",
          status: "used",
        },
      ],
    },
  );
});

test("an unknown voucher status is kept as unknown", () => {
  const result = parseVouchersResponse(200, {
    success: true,
    data: [{ ...voucher, status: "paused" }],
  });
  assert.equal(result.vouchers[0].status, "unknown");
});

test("voucher list failures become a retryable error", async () => {
  assert.deepEqual(parseVouchersResponse(200, { success: true, data: {} }), {
    kind: "error",
  });
  assert.deepEqual(
    await fetchVouchers(async () => {
      throw new TypeError("offline");
    }),
    { kind: "error" },
  );
});

test("voucher use sends no used_at and returns the server code", async () => {
  const result = await requestVoucherUse(9, key, async (url, init) => {
    assert.equal(url, "/api/vouchers/9/use");
    assert.equal(init.headers["Idempotency-Key"], key);
    assert.equal(init.body, undefined);
    return Response.json({
      success: true,
      data: { id: 9, used_at: "2026-11-18T04:00:00Z", use_code: useCode },
    });
  });
  assert.deepEqual(result, {
    kind: "ok",
    id: 9,
    usedAt: "2026-11-18T04:00:00Z",
    useCode,
  });
});

test("voucher use conflicts ask for the latest status", () => {
  for (const [status, code] of [
    [409, "already_used"],
    [409, "expired"],
    [404, "not_found"],
  ]) {
    assert.equal(parseVoucherUseResponse(status, { code }).kind, "conflict");
  }
});

test("a malformed use code is never treated as used", () => {
  const body = {
    success: true,
    data: { id: 9, used_at: "2026-11-18T04:00:00Z", use_code: "nope" },
  };
  assert.equal(parseVoucherUseResponse(200, body).kind, "unknown");
  assert.equal(parseVoucherUseResponse(503, null).kind, "unknown");
});

test("an attempt keeps one key until it is cleared", () => {
  const scope = "test:attempt";
  const first = getAttemptKey(scope);
  assert.match(first, /^[0-9a-f-]{36}$/);
  assert.equal(getAttemptKey(scope), first);
  assert.equal(readAttemptKey(scope), first);
  clearAttemptKey(scope);
  assert.equal(readAttemptKey(scope), null);
  assert.notEqual(getAttemptKey(scope), first);
  clearAttemptKey(scope);
});
