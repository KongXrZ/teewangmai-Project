"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/components/auth-provider";
import {
  fetchRewardsCatalog,
  toRewardsCatalogState,
  type RewardsCatalogResult,
} from "../api/rewards-catalog-adapter";
import type { RewardsCatalogState } from "../types";

export interface RewardsCatalogController {
  state: RewardsCatalogState;
  refresh: () => void;
  isRefreshing: boolean;
}

export function useRewardsCatalog(): RewardsCatalogController {
  const { status: authStatus, refresh: refreshAuth } = useAuth();
  const enabled = authStatus === "authenticated" || authStatus === "error";
  const [result, setResult] = useState<RewardsCatalogResult | null>(null);
  const [requestId, setRequestId] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(() => {
    setIsRefreshing(true);
    setRequestId((id) => id + 1);
  }, []);

  const retry = useCallback(() => {
    setResult(null);
    setRequestId((id) => id + 1);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();

    fetchRewardsCatalog(fetch, controller.signal)
      .then((next) => {
        if (next.kind === "unauthenticated") {
          void refreshAuth().finally(() => {
            if (!controller.signal.aborted) {
              setResult({ kind: "error" });
              setIsRefreshing(false);
            }
          });
          return;
        }
        setResult(next);
        setIsRefreshing(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setResult({ kind: "error" });
          setIsRefreshing(false);
        }
      });

    return () => controller.abort();
  }, [enabled, refreshAuth, requestId]);

  const state: RewardsCatalogState =
    result === null
      ? { status: "loading" }
      : toRewardsCatalogState(result, retry);

  return { state, refresh, isRefreshing };
}
