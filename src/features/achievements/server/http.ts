import { NextResponse } from "next/server";

const headers = { "Cache-Control": "private, no-store" };

const errors = {
  validation: { status: 400, message: "ไม่รองรับพารามิเตอร์นี้" },
  unauthorized: { status: 401, message: "กรุณาเข้าสู่ระบบเพื่อดูความสำเร็จของคุณ" },
  unavailable: { status: 503, message: "ไม่สามารถโหลดความสำเร็จได้ โปรดลองใหม่อีกครั้ง" },
} as const;

export type BadgeErrorCode = keyof typeof errors;

export function badgesJson(data: unknown) {
  return NextResponse.json({ success: true, data }, { headers });
}

export function badgesError(code: BadgeErrorCode) {
  return NextResponse.json(
    { success: false, code, error: errors[code].message },
    { status: errors[code].status, headers },
  );
}
