import { z } from "zod";

export const HISTORY_DEFAULT_LIMIT = 20;
export const HISTORY_MAX_LIMIT = 50;

const cursorSchema = z.object({
  created_at: z.iso
    .datetime({ offset: true })
    .refine((value) => /^(19|20)\d\d-/.test(value)),
  id: z.number().int().positive().max(2147483647),
});

export type HistoryCursor = z.infer<typeof cursorSchema>;

const lostSessionCodes = new Set([
  "session_not_found",
  "refresh_token_not_found",
  "refresh_token_already_used",
  "bad_jwt",
]);

export function isLostSession(error: { name?: string; status?: number; code?: string }) {
  return (
    error.name === "AuthSessionMissingError" ||
    [401, 403].includes(error.status ?? 0) ||
    lostSessionCodes.has(error.code ?? "")
  );
}

export function encodeHistoryCursor(cursor: HistoryCursor) {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

export function parseHistoryQuery(params: URLSearchParams) {
  const keys = [...params.keys()];
  if (keys.some((key) => key !== "limit" && key !== "cursor")) return null;
  if (keys.length !== new Set(keys).size) return null;

  const rawLimit = params.get("limit");
  let limit = HISTORY_DEFAULT_LIMIT;
  if (rawLimit !== null) {
    if (!/^[1-9]\d?$/.test(rawLimit) || Number(rawLimit) > HISTORY_MAX_LIMIT) return null;
    limit = Number(rawLimit);
  }

  const rawCursor = params.get("cursor");
  if (rawCursor === null) return { limit, cursor: null };
  try {
    const parsed = cursorSchema.safeParse(
      JSON.parse(Buffer.from(rawCursor, "base64url").toString("utf8")),
    );
    return parsed.success ? { limit, cursor: parsed.data } : null;
  } catch {
    return null;
  }
}
