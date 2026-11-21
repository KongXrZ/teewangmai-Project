import { NextResponse } from "next/server";
import { readJsonInput } from "../errors";
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
  const input = await readJsonInput(request);
  if (!input.success) {
    return {
      success: false as const,
      response: authJson(input.body, input.status),
    };
  }
  return { success: true as const, body: input.body };
}
