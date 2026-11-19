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
  icon_url: z.string().nullable(),
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
  | { kind: "unavailable"; message?: string }
  | { kind: "error"; message?: string };

const unavailableStatuses = new Set([404, 501, 503]);

export function isVisibleBadge(dto: BadgeDto): boolean {
  return dto.is_active || dto.earned_at !== null;
}

export function toBadgeModel(dto: BadgeDto): BadgeModel {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description?.trim() || null,
    iconUrl: dto.icon_url?.trim() || null,
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
    const message = readErrorMessage(body);
    return message ? { kind: "unavailable", message } : { kind: "unavailable" };
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

function createAbortError(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException("The operation was aborted.", "AbortError");
}

export async function fetchBadges(
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<BadgesResult> {
  if (signal?.aborted) {
    throw createAbortError(signal);
  }

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

  if (signal?.aborted) {
    throw createAbortError(signal);
  }

  let body: unknown = null;
  if (response.headers.get("content-type")?.includes("application/json")) {
    try {
      body = await response.json();
    } catch (error) {
      if (signal?.aborted) {
        throw error;
      }
      body = null;
    }
  }

  if (signal?.aborted) {
    throw createAbortError(signal);
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
      return { status: "unavailable", message: result.message, onRetry };
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
