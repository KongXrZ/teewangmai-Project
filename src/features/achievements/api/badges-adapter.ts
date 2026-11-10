import { z } from "zod";
import type { AchievementsState, BadgeModel } from "../types";

export const BADGES_ENDPOINT = "/api/badges";

const timestampSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "invalid timestamp");

const badgeDtoSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  icon_url: z.string().min(1).nullable(),
  requirement_type: z.string(),
  requirement_value: z.number().int(),
  requirement_text: z.string().nullable().optional(),
  is_active: z.boolean(),
  earned_at: timestampSchema.nullable(),
});

const badgesResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    badges: z.array(badgeDtoSchema),
  }),
});

export type BadgeDto = z.infer<typeof badgeDtoSchema>;

export type BadgesResult =
  | { kind: "ok"; badges: BadgeModel[] }
  | { kind: "unauthenticated" }
  | { kind: "unavailable" }
  | { kind: "error"; message?: string };

const unavailableStatuses = new Set([404, 501, 503]);

/**
 * Inactive badges stay visible only to users who already earned them.
 * The server should already filter; this guards against stale rows.
 */
export function isVisibleBadge(dto: BadgeDto): boolean {
  return dto.is_active || dto.earned_at !== null;
}

export function toBadgeModel(dto: BadgeDto): BadgeModel {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description?.trim() || null,
    iconUrl: dto.icon_url,
    requirement: {
      type: dto.requirement_type,
      value: dto.requirement_value,
      description: dto.requirement_text?.trim() || null,
    },
    earnedAt: dto.earned_at,
  };
}

export function parseBadgesResponse(
  status: number,
  body: unknown,
): BadgesResult {
  if (status === 401) {
    return { kind: "unauthenticated" };
  }
  if (unavailableStatuses.has(status)) {
    return { kind: "unavailable" };
  }
  if (status < 200 || status >= 300) {
    return { kind: "error", message: readErrorMessage(body) };
  }

  const parsed = badgesResponseSchema.safeParse(body);
  if (!parsed.success) {
    return { kind: "error" };
  }

  return {
    kind: "ok",
    badges: parsed.data.data.badges.filter(isVisibleBadge).map(toBadgeModel),
  };
}

export async function fetchBadges(
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<BadgesResult> {
  let response: Response;
  try {
    response = await fetchImpl(BADGES_ENDPOINT, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }
    return { kind: "error" };
  }

  let body: unknown = null;
  if (response.headers.get("content-type")?.includes("application/json")) {
    body = await response.json().catch(() => null);
  }

  return parseBadgesResponse(response.status, body);
}

export function toAchievementsState(
  result: BadgesResult,
  onRetry: () => void,
): AchievementsState {
  switch (result.kind) {
    case "ok":
      return { status: "ready", badges: result.badges };
    case "unavailable":
      return { status: "unavailable" };
    case "unauthenticated":
      return {
        status: "error",
        message: "กรุณาเข้าสู่ระบบเพื่อดูความสำเร็จของคุณ",
      };
    case "error":
      return { status: "error", message: result.message, onRetry };
  }
}

function readErrorMessage(body: unknown): string | undefined {
  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof body.error === "string" &&
    body.error.length > 0
  ) {
    return body.error;
  }
  return undefined;
}
