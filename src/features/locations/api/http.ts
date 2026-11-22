import { NextResponse } from "next/server";
import { bangkokClock } from "./hours";

export function catalogJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export function catalogError(code: "validation" | "not_found" | "unavailable") {
  const errors = {
    validation: { status: 400, error: "Invalid location request" },
    not_found: { status: 404, error: "Building or floor not found" },
    unavailable: { status: 503, error: "Location service is unavailable" },
  };
  return catalogJson({ success: false, code, error: errors[code].error }, errors[code].status);
}

export function catalogMeta(now: Date) {
  return { timezone: "Asia/Bangkok", day_of_week: bangkokClock(now).day, evaluated_at: now.toISOString() };
}
