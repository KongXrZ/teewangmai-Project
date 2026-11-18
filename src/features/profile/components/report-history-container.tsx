"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/components/auth-provider";
import { fetchCheckinHistory } from "./checkin-history-client";
import { ReportHistoryPage } from "./report-history-page";
import type { ReportHistoryItem, ReportHistoryState } from "./profile-view-models";

interface HistoryData {
  userId: string;
  attempt: number;
  failed: boolean;
  reports: ReportHistoryItem[];
  nextCursor: string | null;
  loadingMore: boolean;
  loadMoreFailed: boolean;
}

export function ReportHistoryContainer() {
  const router = useRouter();
  const { status, user, refresh } = useAuth();
  const userId = status === "authenticated" ? (user?.id ?? null) : null;
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [attempt, setAttempt] = useState(0);
  const moreRequest = useRef<AbortController | null>(null);
  const loadedKey = useRef<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login?next=%2Fprofile%2Freports");
  }, [status, router]);

  useEffect(() => {
    if (!userId) return;
    const key = `${userId}:${attempt}`;
    if (loadedKey.current === key) return;
    loadedKey.current = null;
    const controller = new AbortController();
    const empty = {
      userId,
      attempt,
      reports: [],
      nextCursor: null,
      loadingMore: false,
      loadMoreFailed: false,
    };
    fetchCheckinHistory({ signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        if (result.ok) {
          loadedKey.current = key;
          setHistory({ ...empty, failed: false, reports: result.reports, nextCursor: result.nextCursor });
          return;
        }
        if (result.unauthorized) void refresh();
        setHistory({ ...empty, failed: true });
      })
      .catch(() => {
        if (!controller.signal.aborted) setHistory({ ...empty, failed: true });
      });
    return () => {
      controller.abort();
      moreRequest.current?.abort();
    };
  }, [userId, attempt, refresh]);

  const current =
    history && history.userId === userId && history.attempt === attempt ? history : null;

  async function loadMore() {
    if (!current || current.loadingMore || !current.nextCursor) return;
    const controller = new AbortController();
    moreRequest.current = controller;
    const owner = current.userId;
    const settle = (update: (data: HistoryData) => HistoryData) =>
      setHistory((data) => (data && data.userId === owner ? update(data) : data));
    settle((data) => ({ ...data, loadingMore: true, loadMoreFailed: false }));
    try {
      const result = await fetchCheckinHistory({
        cursor: current.nextCursor,
        signal: controller.signal,
      });
      if (controller.signal.aborted) {
        settle((data) => ({ ...data, loadingMore: false }));
        return;
      }
      if (result.ok) {
        settle((data) => ({
          ...data,
          reports: [...data.reports, ...result.reports],
          nextCursor: result.nextCursor,
          loadingMore: false,
        }));
        return;
      }
      if (result.unauthorized) void refresh();
      settle((data) => ({ ...data, loadingMore: false, loadMoreFailed: true }));
    } catch {
      settle((data) => ({
        ...data,
        loadingMore: false,
        loadMoreFailed: !controller.signal.aborted,
      }));
    }
  }

  let state: ReportHistoryState;
  if (status === "error" || current?.failed) {
    state = { status: "error" };
  } else if (!current) {
    state = { status: "loading" };
  } else {
    state = {
      status: "ready",
      reports: current.reports,
      hasMore: current.nextCursor !== null,
      loadingMore: current.loadingMore,
      loadMoreFailed: current.loadMoreFailed,
    };
  }

  return (
    <ReportHistoryPage
      state={state}
      onBack={() => router.push("/profile")}
      onStartReport={() => router.push("/scan")}
      onRetry={() => (status === "error" ? void refresh() : setAttempt((value) => value + 1))}
      onLoadMore={() => void loadMore()}
    />
  );
}
