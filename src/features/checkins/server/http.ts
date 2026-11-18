import { createClient } from "@/lib/supabase/server";
import { authJson } from "@/features/auth/server/http";

const errors = {
  validation: { status: 400, message: "ข้อมูลที่ส่งมาไม่ถูกต้อง" },
  unauthorized: { status: 401, message: "กรุณาเข้าสู่ระบบก่อนเช็คอิน" },
  invalid_qr: { status: 404, message: "QR นี้ไม่ใช่ของชั้นที่เปิดให้เช็คอิน" },
  cooldown: { status: 409, message: "รายงานชั้นนี้ไปแล้ว รอ 30 นาทีก่อนรายงานอีกครั้ง" },
  gps_inaccurate: { status: 422, message: "ตำแหน่ง GPS ยังไม่แม่นพอ ลองใหม่ในที่โล่งกว่านี้" },
  out_of_range: { status: 422, message: "ตำแหน่งของคุณอยู่ไกลจากอาคารนี้เกินไป" },
  unavailable: { status: 503, message: "ระบบเช็คอินไม่พร้อมใช้งาน โปรดลองใหม่อีกครั้ง" },
} as const;

export type CheckinErrorCode = keyof typeof errors;

export function checkinJson(data: unknown, status = 200) {
  return authJson({ success: true, data }, status);
}

export function checkinError(code: CheckinErrorCode, extra: Record<string, unknown> = {}) {
  return authJson(
    { success: false, code, error: errors[code].message, ...extra },
    errors[code].status,
  );
}

export function outcomeCode(outcome: string): CheckinErrorCode {
  return Object.hasOwn(errors, outcome) ? (outcome as CheckinErrorCode) : "unavailable";
}

const lostSessionCodes = new Set([
  "session_not_found",
  "refresh_token_not_found",
  "refresh_token_already_used",
  "bad_jwt",
]);

export async function checkinSession() {
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
