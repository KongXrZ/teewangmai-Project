"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/components/auth-provider";
import {
  fetchBadges,
  toAchievementsState,
  type BadgesResult,
} from "../api/badges-adapter";
import { createBadgesRefreshRunner } from "../refresh-controller";
import type { AchievementsState } from "../types";

const LOGIN_ROUTE = "/login?next=%2Fachievements";

export interface AchievementsController {
  state: AchievementsState;
  refresh: () => void;
  isRefreshing: boolean;
}

export function useAchievements(): AchievementsController {
  const router = useRouter();
  const { refresh: refreshAuth } = useAuth();
  const [runner] = useState(createBadgesRefreshRunner);
  const [result, setResult] = useState<BadgesResult | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startLoad = useCallback(() => {
    void runner.start((signal) => fetchBadges(fetch, signal), {
      onSuccess(next) {
        setResult(next);
        setIsRefreshing(false);
        if (next.kind === "unauthenticated") {
          void refreshAuth();
          router.replace(LOGIN_ROUTE);
        }
      },
      onError() {
        setResult({ kind: "error" });
        setIsRefreshing(false);
      },
    });
  }, [refreshAuth, router, runner]);

  const refresh = useCallback(() => {
    setIsRefreshing(true);
    startLoad();
  }, [startLoad]);

  const retry = useCallback(() => {
    setResult(null);
    setIsRefreshing(false);
    startLoad();
  }, [startLoad]);

  useEffect(() => {
    startLoad();
    return () => {
      runner.cancel();
    };
  }, [runner, startLoad]);

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        refresh();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [refresh]);

  const state: AchievementsState =
    result === null
      ? { status: "loading" }
      : toAchievementsState(result, retry);

  return { state, refresh, isRefreshing };
}
