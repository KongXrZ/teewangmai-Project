"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/components/auth-provider";
import {
  fetchBadges,
  toAchievementsState,
  type BadgesResult,
} from "../api/badges-adapter";
import { createBadgesRefreshRunner } from "../refresh-controller";
import type { AchievementsState } from "../types";

export interface AchievementsController {
  state: AchievementsState;
  refresh: () => void;
  isRefreshing: boolean;
}

export function useAchievements(): AchievementsController {
  const { status: authStatus, refresh: refreshAuth } = useAuth();
  const enabled = authStatus === "authenticated" || authStatus === "error";
  const [runner] = useState(createBadgesRefreshRunner);
  const [result, setResult] = useState<BadgesResult | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startLoad = useCallback(() => {
    void runner.start((signal) => fetchBadges(fetch, signal), {
      onSuccess(next) {
        if (next.kind === "unauthenticated") {
          void refreshAuth().finally(() => {
            setResult({ kind: "error" });
            setIsRefreshing(false);
          });
          return;
        }
        setResult(next);
        setIsRefreshing(false);
      },
      onError() {
        setResult({ kind: "error" });
        setIsRefreshing(false);
      },
    });
  }, [refreshAuth, runner]);

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
    if (!enabled) return;
    startLoad();
    return () => {
      runner.cancel();
    };
  }, [enabled, runner, startLoad]);

  useEffect(() => {
    if (!enabled) return;
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
  }, [enabled, refresh]);

  const state: AchievementsState =
    result === null
      ? { status: "loading" }
      : toAchievementsState(result, retry);

  return { state, refresh, isRefreshing };
}
