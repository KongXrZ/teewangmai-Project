import { NextResponse } from "next/server";
import type { AuthActionResult } from "../types";

export function authJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export function authStatus(result: AuthActionResult) {
  if (result.success) return 200;
  switch (result.code) {
    case "validation":
    case "rejected":
      return 400;
    case "unauthorized":
      return 401;
    case "rate_limited":
      return 429;
    default:
      return 503;
  }
}

export async function readAuthInput(request: Request) {
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  ) {
    return {
      success: false as const,
      response: authJson(
        { success: false, error: "กรุณาส่งข้อมูลแบบ JSON" },
        415,
      ),
    };
  }
  try {
    return { success: true as const, body: (await request.json()) as unknown };
  } catch {
    return {
      success: false as const,
      response: authJson(
        { success: false, error: "ข้อมูล JSON ไม่ถูกต้อง" },
        400,
      ),
    };
  }
}
