import type { RewardCardModel } from "./types";

export type RedemptionResult =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "insufficient_points"; message?: string }
  | { status: "unavailable"; message?: string }
  | { status: "failure"; message?: string; retryable?: boolean }
  | { status: "success"; message?: string };

export type RedemptionStatus = RedemptionResult["status"];

export type RedemptionCloseReason = "cancel" | "done";

export type RedemptionStep =
  "confirm" | Exclude<RedemptionStatus, "idle" | "pending">;

export interface RedemptionView {
  step: RedemptionStep;
  pending: boolean;
  canDismiss: boolean;
  canConfirm: boolean;
  canRetry: boolean;
}

export function getRedemptionView(result: RedemptionResult): RedemptionView {
  const pending = result.status === "pending";
  const step: RedemptionStep =
    result.status === "idle" || result.status === "pending"
      ? "confirm"
      : result.status;

  return {
    step,
    pending,
    canDismiss: !pending,
    canConfirm: result.status === "idle",
    canRetry: result.status === "failure" && result.retryable !== false,
  };
}

export function getCloseReason(
  result: RedemptionResult,
): RedemptionCloseReason {
  return result.status === "success" ? "done" : "cancel";
}

export type RedemptionConfirmHandler = (reward: RewardCardModel) => void;
