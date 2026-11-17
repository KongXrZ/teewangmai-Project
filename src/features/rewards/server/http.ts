import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { authJson } from "@/features/auth/server/http";

const errors = {
  validation: { status: 400, message: "ข้อมูลที่ส่งมาไม่ถูกต้อง" },
  unauthorized: { status: 401, message: "กรุณาเข้าสู่ระบบก่อนทำรายการ" },
  not_found: { status: 404, message: "ไม่พบรายการนี้" },
  insufficient_points: { status: 409, message: "แต้มไม่พอสำหรับรางวัลนี้" },
  out_of_stock: { status: 409, message: "รางวัลนี้หมดแล้ว" },
  limit_reached: { status: 409, message: "แลกรางวัลนี้ครบจำนวนสิทธิ์แล้ว" },
  upcoming: { status: 409, message: "รางวัลนี้ยังไม่เปิดให้แลก" },
  expired: { status: 409, message: "หมดเขตแล้ว" },
  already_used: { status: 409, message: "คูปองนี้ใช้ไปแล้ว" },
  key_conflict: { status: 422, message: "Idempotency-Key นี้ถูกใช้กับรางวัลอื่นแล้ว" },
  unavailable: { status: 503, message: "ระบบรางวัลไม่พร้อมใช้งาน โปรดลองใหม่อีกครั้ง" },
} as const;

export type RewardsErrorCode = keyof typeof errors;

export function rewardsJson(data: unknown) {
  return authJson({ success: true, data });
}

export function rewardsError(code: RewardsErrorCode) {
  return authJson(
    { success: false, code, error: errors[code].message },
    errors[code].status,
  );
}

export function outcomeError(outcome: string) {
  return rewardsError(
    Object.hasOwn(errors, outcome) ? (outcome as RewardsErrorCode) : "unavailable",
  );
}

export function parseRewardsId(value: string) {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id <= 2147483647 ? id : null;
}

export function parseIdempotencyKey(value: string | null) {
  const parsed = z.uuid().safeParse(value);
  return parsed.success ? parsed.data : null;
}

const lostSessionCodes = new Set([
  "session_not_found",
  "refresh_token_not_found",
  "refresh_token_already_used",
  "bad_jwt",
]);

export async function rewardsSession() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) {
    const lost =
      error.name === "AuthSessionMissingError" ||
      [401, 403].includes(error.status ?? 0) ||
      lostSessionCodes.has(error.code ?? "");
    return { failure: lost ? ("unauthorized" as const) : ("unavailable" as const) };
  }
  if (!user) return { failure: "unauthorized" as const };
  return { failure: null, supabase, user };
}
