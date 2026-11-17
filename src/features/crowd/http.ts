import { NextResponse } from "next/server";

const headers = { "Cache-Control": "private, no-store" };

export function crowdJson(data: unknown) {
  return NextResponse.json({ success: true, data, meta: {
    lookback_minutes: 30, refresh_minutes: 10, stale_after_minutes: 20,
    timezone: "Asia/Bangkok",
  } }, { headers });
}

export function crowdError(code: "validation" | "not_found" | "unavailable") {
  const errors = {
    validation: { status: 400, message: "Invalid resource ID or query" },
    not_found: { status: 404, message: "Active floor summaries not found" },
    unavailable: { status: 503, message: "Crowd summaries temporarily unavailable" },
  };
  return NextResponse.json({ success: false, code, error: errors[code].message },
    { status: errors[code].status, headers });
}

export function parseCrowdId(value: string) {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id <= 2147483647 ? id : null;
}
