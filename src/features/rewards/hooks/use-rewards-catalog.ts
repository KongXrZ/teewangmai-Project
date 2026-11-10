"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchRewardsCatalog,
  toRewardsCatalogState,
  type RewardsCatalogResult,
} from "../api/rewards-catalog-adapter";
import type { RewardsCatalogState } from "../types";

const LOGIN_ROUTE = "/login";

export interface RewardsCatalogController {
  state: RewardsCatalogState;
  /** Re-fetch points and catalog while keeping the current view on screen. */
  refresh: () => void;
  isRefreshing: boolean;
}

export function useRewardsCatalog(): RewardsCatalogController {
  const router = useRouter();
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
    const controller = new AbortController();

    fetchRewardsCatalog(fetch, controller.signal)
      .then((next) => {
        setResult(next);
        setIsRefreshing(false);
        if (next.kind === "unauthenticated") {
          router.replace(LOGIN_ROUTE);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setResult({ kind: "error" });
          setIsRefreshing(false);
        }
      });

    return () => controller.abort();
  }, [requestId, router]);

  const state: RewardsCatalogState =
    result === null
      ? { status: "loading" }
      : toRewardsCatalogState(result, retry);

  return { state, refresh, isRefreshing };
}
