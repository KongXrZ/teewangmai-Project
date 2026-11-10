"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchBadges,
  toAchievementsState,
  type BadgesResult,
} from "../api/badges-adapter";
import type { AchievementsState } from "../types";

const LOGIN_ROUTE = "/login";

export interface AchievementsController {
  state: AchievementsState;
  /** Re-fetch catalog/earned state while keeping the current view on screen. */
  refresh: () => void;
  isRefreshing: boolean;
}

export function useAchievements(): AchievementsController {
  const router = useRouter();
  const [result, setResult] = useState<BadgesResult | null>(null);
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

    fetchBadges(fetch, controller.signal)
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

  // Badges are awarded server-side (e.g. after a check-in elsewhere), so
  // pick up changes when the user returns to this tab.
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [refresh]);

  const state: AchievementsState =
    result === null
      ? { status: "loading" }
      : toAchievementsState(result, retry);

  return { state, refresh, isRefreshing };
}
