export type BadgeId = number;

export interface BadgeRequirementModel {
  /** Raw `badges.requirement_type`; displayed context only, never evaluated. */
  type: string;
  /** Raw `badges.requirement_value`; displayed context only, never evaluated. */
  value: number;
  /** Human-readable requirement text from the server, or `null` for fallback. */
  description: string | null;
}

export interface BadgeModel {
  id: BadgeId;
  name: string;
  description: string | null;
  iconUrl: string | null;
  requirement: BadgeRequirementModel;
  /** ISO timestamp from `user_badges.earned_at`; `null` means not earned. */
  earnedAt: string | null;
}

export type BadgeFilter = "all" | "earned" | "locked";

export type AchievementsState =
  | { status: "loading" }
  | { status: "unavailable"; message?: string }
  | { status: "error"; message?: string; onRetry?: () => void }
  | { status: "ready"; badges: BadgeModel[] };

export type BadgeSelectHandler = (badge: BadgeModel) => void;
