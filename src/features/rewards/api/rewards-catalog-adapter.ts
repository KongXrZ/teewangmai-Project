import { z } from "zod";
import type {
  RewardAvailability,
  RewardCardModel,
  RewardsCatalogState,
} from "../types";

export const REWARDS_CATALOG_ENDPOINT = "/api/rewards";

const availabilityValues = [
  "redeemable",
  "insufficient_points",
  "out_of_stock",
  "upcoming",
  "unavailable",
] as const satisfies readonly RewardAvailability[];

const rewardDtoSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  points_required: z.number().int().nonnegative(),
  image_url: z.string().min(1).nullable(),
  availability: z.string(),
});

const catalogResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    points: z.number().int().nonnegative(),
    rewards: z.array(rewardDtoSchema),
  }),
});

export type RewardDto = z.infer<typeof rewardDtoSchema>;

export type RewardsCatalogResult =
  | { kind: "ok"; points: number; rewards: RewardCardModel[] }
  | { kind: "unauthenticated" }
  | { kind: "unavailable" }
  | { kind: "error"; message?: string };

const unavailableStatuses = new Set([404, 501, 503]);

function toAvailability(value: string): RewardAvailability {
  return (availabilityValues as readonly string[]).includes(value)
    ? (value as RewardAvailability)
    : "unavailable";
}

export function toRewardCardModel(dto: RewardDto): RewardCardModel {
  return {
    id: dto.id,
    title: dto.title,
    pointsRequired: dto.points_required,
    imageUrl: dto.image_url,
    availability: toAvailability(dto.availability),
  };
}

export function parseRewardsCatalogResponse(
  status: number,
  body: unknown,
): RewardsCatalogResult {
  if (status === 401) {
    return { kind: "unauthenticated" };
  }
  if (unavailableStatuses.has(status)) {
    return { kind: "unavailable" };
  }
  if (status < 200 || status >= 300) {
    return { kind: "error", message: readErrorMessage(body) };
  }

  const parsed = catalogResponseSchema.safeParse(body);
  if (!parsed.success) {
    return { kind: "error" };
  }

  return {
    kind: "ok",
    points: parsed.data.data.points,
    rewards: parsed.data.data.rewards.map(toRewardCardModel),
  };
}

export async function fetchRewardsCatalog(
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<RewardsCatalogResult> {
  let response: Response;
  try {
    response = await fetchImpl(REWARDS_CATALOG_ENDPOINT, {
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

  return parseRewardsCatalogResponse(response.status, body);
}

export function toRewardsCatalogState(
  result: RewardsCatalogResult,
  onRetry: () => void,
): RewardsCatalogState {
  switch (result.kind) {
    case "ok":
      return { status: "ready", points: result.points, rewards: result.rewards };
    case "unavailable":
      return { status: "unavailable" };
    case "unauthenticated":
      return {
        status: "error",
        message: "กรุณาเข้าสู่ระบบเพื่อดูแต้มและรางวัล",
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
