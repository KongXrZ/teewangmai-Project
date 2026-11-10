export type RewardId = number;

export type RewardAvailability =
  | "redeemable"
  | "insufficient_points"
  | "out_of_stock"
  | "upcoming"
  | "unavailable";

export interface RewardCardModel {
  id: RewardId;
  title: string;
  pointsRequired: number;
  imageUrl: string | null;
  availability: RewardAvailability;
}

export type RewardsCatalogState =
  | { status: "loading" }
  | { status: "unavailable"; message?: string }
  | { status: "error"; message?: string; onRetry?: () => void }
  | { status: "ready"; points: number; rewards: RewardCardModel[] };

export type RewardSelectHandler = (reward: RewardCardModel) => void;
