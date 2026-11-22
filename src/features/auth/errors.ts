import type { AuthActionResult } from "./types";

export const AUTH_UNAVAILABLE = "ไม่สามารถติดต่อระบบได้ กรุณาลองใหม่อีกครั้ง";

export function getAuthErrorCode(error: { code?: string }) {
  switch (error.code) {
    case "invalid_credentials":
    case "email_not_confirmed":
      return "unauthorized" as const;
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "rate_limited" as const;
    case "user_already_exists":
    case "email_exists":
    case "weak_password":
    case "same_password":
    case "signup_disabled":
      return "rejected" as const;
    default:
      return "unavailable" as const;
  }
}

// Only known public error codes become UI messages. Never render provider messages.
export function getAuthErrorMessage(error: { code?: string }): string {
  switch (error.code) {
    case "invalid_credentials":
      return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
    case "email_not_confirmed":
      return "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ";
    case "user_already_exists":
    case "email_exists":
      return "ไม่สามารถสมัครด้วยอีเมลนี้ได้ กรุณาเข้าสู่ระบบหรือใช้ช่องทางกู้รหัสผ่าน";
    case "weak_password":
      return "รหัสผ่านไม่ผ่านข้อกำหนด กรุณาเปลี่ยนรหัสผ่านแล้วลองอีกครั้ง";
    case "same_password":
      return "กรุณาตั้งรหัสผ่านใหม่ที่ไม่ซ้ำกับรหัสผ่านเดิม";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "ทำรายการบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่";
    case "signup_disabled":
      return "ระบบยังไม่เปิดรับสมัครสมาชิกในขณะนี้";
    default:
      return AUTH_UNAVAILABLE;
  }
}

export async function readJsonInput(request: Request): Promise<
  | { success: true; body: unknown }
  | {
      success: false;
      status: 400 | 415;
      body: { success: false; code: "validation"; error: string };
    }
> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  ) {
    return {
      success: false,
      status: 415,
      body: {
        success: false,
        code: "validation",
        error: "กรุณาส่งข้อมูลแบบ JSON",
      },
    };
  }
  try {
    return { success: true, body: (await request.json()) as unknown };
  } catch {
    return {
      success: false,
      status: 400,
      body: {
        success: false,
        code: "validation",
        error: "ข้อมูล JSON ไม่ถูกต้อง",
      },
    };
  }
}

export function resolveProfileUpdateOutcome(
  updated: readonly { id: unknown }[] | null,
  error: unknown,
): AuthActionResult {
  if (error) {
    return { success: false, code: "unavailable", error: AUTH_UNAVAILABLE };
  }
  if (!updated || updated.length === 0) {
    return {
      success: false,
      code: "rejected",
      error: "ไม่พบข้อมูลโปรไฟล์ของคุณ กรุณาลองใหม่อีกครั้ง",
    };
  }
  return { success: true, message: "อัปเดตโปรไฟล์เรียบร้อยแล้ว" };
}
