"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/components/auth-provider";
import {
  clearAttemptKey,
  getAttemptKey,
  redeemAttemptScope,
} from "../api/attempt-keys";
import { redeemReward, toRedemptionResult } from "../api/redemption-adapter";
import type { RedemptionResult } from "../redemption";
import type { RewardCardModel } from "../types";
import { RedemptionDialog } from "./redemption-dialog";
import type { RedemptionFlowProps } from "./rewards-catalog-container";

export function RedemptionFlow({
  reward,
  points,
  onClose,
  onRedemptionConfirmed,
  onRedeemed,
}: RedemptionFlowProps) {
  const router = useRouter();
  const { refresh: refreshAuth } = useAuth();
  const [result, setResult] = useState<RedemptionResult>({ status: "idle" });
  const [voucherId, setVoucherId] = useState<number | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  function confirm(target: RewardCardModel) {
    const controller = new AbortController();
    const scope = redeemAttemptScope(target.id);
    controllerRef.current?.abort();
    controllerRef.current = controller;
    setResult({ status: "pending" });

    redeemReward(target.id, getAttemptKey(scope), fetch, controller.signal)
      .then((next) => {
        if (controller.signal.aborted) {
          return;
        }
        if (next.kind !== "unknown") {
          clearAttemptKey(scope);
        }
        if (next.kind === "unauthenticated") {
          void refreshAuth().finally(() => {
            if (!controller.signal.aborted) {
              setResult({ status: "failure", retryable: true });
            }
          });
          return;
        }
        if (next.kind === "ok") {
          void refreshAuth();
          setVoucherId(next.voucherId);
          onRedeemed?.(next.points);
        }
        setResult(toRedemptionResult(next));
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setResult({ status: "failure", retryable: true });
        }
      });
  }

  function close() {
    if (result.status === "idle") {
      onClose();
    } else {
      onRedemptionConfirmed();
    }
  }

  return (
    <RedemptionDialog
      open
      reward={reward}
      points={points}
      result={result}
      onConfirm={confirm}
      onClose={close}
      onViewVoucher={
        voucherId === null
          ? undefined
          : () => router.push(`/rewards/vouchers/${voucherId}`)
      }
    />
  );
}
