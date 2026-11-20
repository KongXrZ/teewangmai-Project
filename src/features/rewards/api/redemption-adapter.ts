import { z } from "zod";
import type { RedemptionResult } from "../redemption";
import type { VoucherModel, VoucherStatus } from "../vouchers";

const REQUEST_TIMEOUT_MS = 15_000;

const redeemResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    replayed: z.boolean(),
    points: z.number().int().nonnegative(),
    voucher: z.object({ id: z.number().int().positive() }),
  }),
});

const voucherDtoSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  image_url: z.string().nullable(),
  used_points: z.number().int().nonnegative(),
  redeemed_at: z.string().min(1),
  expires_at: z.string().min(1),
  used_at: z.string().min(1).nullable(),
  status: z.string(),
});

const vouchersResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(voucherDtoSchema),
});

const voucherUseResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.number().int().positive(),
    used_at: z.string().min(1),
    use_code: z.string().regex(/^[0-9a-f]{32}$/),
  }),
});

export type RedeemRewardResult =
  | { kind: "ok"; voucherId: number; points: number }
  | { kind: "unauthenticated" }
  | { kind: "insufficient_points"; message?: string }
  | { kind: "unavailable"; message?: string }
  | { kind: "rejected"; message?: string }
  | { kind: "unknown"; message?: string };

export type VouchersResult =
  | { kind: "ok"; vouchers: VoucherModel[] }
  | { kind: "unauthenticated" }
  | { kind: "error"; message?: string };

export type VoucherUseResult =
  | { kind: "ok"; id: number; usedAt: string; useCode: string }
  | { kind: "unauthenticated" }
  | { kind: "conflict"; message?: string }
  | { kind: "rejected"; message?: string }
  | { kind: "unknown"; message?: string };

const unavailableRedeemCodes = new Set([
  "not_found",
  "out_of_stock",
  "limit_reached",
  "upcoming",
  "expired",
]);

const voucherConflictCodes = new Set(["already_used", "expired", "not_found"]);

function readString(body: unknown, field: "code" | "error") {
  if (typeof body !== "object" || body === null || !(field in body)) {
    return undefined;
  }
  const value = (body as Record<string, unknown>)[field];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isDefinitiveRejection(status: number) {
  return status >= 400 && status < 500;
}

export function parseRedeemResponse(
  status: number,
  body: unknown,
): RedeemRewardResult {
  if (status === 401) {
    return { kind: "unauthenticated" };
  }
  if (status >= 200 && status < 300) {
    const parsed = redeemResponseSchema.safeParse(body);
    return parsed.success
      ? {
          kind: "ok",
          voucherId: parsed.data.data.voucher.id,
          points: parsed.data.data.points,
        }
      : { kind: "unknown" };
  }

  const code = readString(body, "code");
  const message = readString(body, "error");
  if (code === "insufficient_points") {
    return { kind: "insufficient_points", message };
  }
  if (code !== undefined && unavailableRedeemCodes.has(code)) {
    return { kind: "unavailable", message };
  }
  return isDefinitiveRejection(status)
    ? { kind: "rejected", message }
    : { kind: "unknown", message };
}

export function toRedemptionResult(
  result: Exclude<RedeemRewardResult, { kind: "unauthenticated" }>,
): RedemptionResult {
  switch (result.kind) {
    case "ok":
      return { status: "success" };
    case "insufficient_points":
      return { status: "insufficient_points", message: result.message };
    case "unavailable":
      return { status: "unavailable", message: result.message };
    case "rejected":
      return { status: "failure", message: result.message, retryable: false };
    case "unknown":
      return { status: "failure", message: result.message, retryable: true };
  }
}

function toVoucherStatus(value: string): VoucherStatus | "unknown" {
  return value === "available" || value === "used" || value === "expired"
    ? value
    : "unknown";
}

export function parseVouchersResponse(
  status: number,
  body: unknown,
): VouchersResult {
  if (status === 401) {
    return { kind: "unauthenticated" };
  }
  if (status < 200 || status >= 300) {
    return { kind: "error", message: readString(body, "error") };
  }
  const parsed = vouchersResponseSchema.safeParse(body);
  if (!parsed.success) {
    return { kind: "error" };
  }
  return {
    kind: "ok",
    vouchers: parsed.data.data.map((voucher) => ({
      id: voucher.id,
      title: voucher.title,
      imageUrl: voucher.image_url?.trim() || null,
      usedPoints: voucher.used_points,
      redeemedAt: voucher.redeemed_at,
      expiresAt: voucher.expires_at,
      usedAt: voucher.used_at,
      status: toVoucherStatus(voucher.status),
    })),
  };
}

export function parseVoucherUseResponse(
  status: number,
  body: unknown,
): VoucherUseResult {
  if (status === 401) {
    return { kind: "unauthenticated" };
  }
  if (status >= 200 && status < 300) {
    const parsed = voucherUseResponseSchema.safeParse(body);
    return parsed.success
      ? {
          kind: "ok",
          id: parsed.data.data.id,
          usedAt: parsed.data.data.used_at,
          useCode: parsed.data.data.use_code,
        }
      : { kind: "unknown" };
  }

  const code = readString(body, "code");
  const message = readString(body, "error");
  if (code !== undefined && voucherConflictCodes.has(code)) {
    return { kind: "conflict", message };
  }
  return isDefinitiveRejection(status)
    ? { kind: "rejected", message }
    : { kind: "unknown", message };
}

async function send(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
  signal?: AbortSignal,
): Promise<{ status: number; body: unknown } | null> {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    const body = response.headers
      .get("content-type")
      ?.includes("application/json")
      ? await response.json().catch((error: unknown) => {
          if (signal?.aborted) {
            throw error;
          }
          return null;
        })
      : null;
    return { status: response.status, body };
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }
    return null;
  }
}

export async function redeemReward(
  rewardId: number,
  idempotencyKey: string,
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<RedeemRewardResult> {
  const response = await send(
    fetchImpl,
    `/api/rewards/${rewardId}/redeem`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Idempotency-Key": idempotencyKey,
      },
    },
    signal,
  );
  return response
    ? parseRedeemResponse(response.status, response.body)
    : { kind: "unknown" };
}

export async function fetchVouchers(
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<VouchersResult> {
  const response = await send(
    fetchImpl,
    "/api/vouchers",
    { method: "GET", headers: { Accept: "application/json" } },
    signal,
  );
  return response
    ? parseVouchersResponse(response.status, response.body)
    : { kind: "error" };
}

export async function requestVoucherUse(
  voucherId: number,
  idempotencyKey: string,
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<VoucherUseResult> {
  const response = await send(
    fetchImpl,
    `/api/vouchers/${voucherId}/use`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Idempotency-Key": idempotencyKey,
      },
    },
    signal,
  );
  return response
    ? parseVoucherUseResponse(response.status, response.body)
    : { kind: "unknown" };
}
