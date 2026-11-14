export type BadgeId = number;

export interface BadgeRequirementModel {
  type: string;
  value: number;
  description: string | null;
}

export interface BadgeModel {
  id: BadgeId;
  name: string;
  description: string | null;
  iconUrl: string | null;
  requirement: BadgeRequirementModel;
  earnedAt: string | null;
}

export type BadgeFilter = "all" | "earned" | "locked";

export type AchievementsState =
  | { status: "loading" }
  | { status: "unavailable"; message?: string }
  | { status: "error"; message?: string; onRetry?: () => void }
  | { status: "ready"; badges: BadgeModel[] };

export type BadgeSelectHandler = (badge: BadgeModel) => void;
