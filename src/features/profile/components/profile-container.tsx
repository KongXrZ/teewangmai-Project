"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchBadges } from "@/features/achievements/api/badges-adapter";
import { countEarnedBadges } from "@/features/achievements/view-model";
import { useAuth } from "@/features/auth/components/auth-provider";
import { fetchCheckinHistory } from "./checkin-history-client";
import { ProfilePage } from "./profile-page";
import type { ProfileState } from "./profile-view-models";

export function ProfileContainer() {
  const router = useRouter();
  const auth = useAuth();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [reportTotal, setReportTotal] = useState<{ userId: string; total: number } | null>(null);
  const [badgeTotal, setBadgeTotal] = useState<{ userId: string; total: number } | null>(null);
  const userId = auth.status === "authenticated" ? (auth.user?.id ?? null) : null;
  const { refresh } = auth;

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    fetchCheckinHistory({ limit: 1, signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        if (result.ok && result.total !== null) {
          setReportTotal({ userId, total: result.total });
        } else if (!result.ok && result.unauthorized) {
          void refresh();
        }
      })
      .catch(() => {});
    fetchBadges(fetch, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        if (result.kind === "ok") {
          setBadgeTotal({ userId, total: countEarnedBadges(result.badges) });
        } else if (result.kind === "unauthenticated") {
          void refresh();
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [userId, refresh]);

  let state: ProfileState;
  if (auth.status === "loading") {
    state = { status: "loading" };
  } else if (auth.status === "error") {
    state = { status: "error" };
  } else if (auth.status === "unauthenticated" || !auth.profile) {
    state = { status: "signed-out" };
  } else {
    state = {
      status: "ready",
      profile: {
        name: auth.profile.name,
        avatarUrl: auth.profile.avatar_url,
        points: auth.profile.points,
        reportCount: reportTotal?.userId === userId ? reportTotal.total : null,
        badgeCount: badgeTotal?.userId === userId ? badgeTotal.total : null,
      },
    };
  }

  async function handleLogout() {
    setLogoutError(null);
    const result = await auth.signOut();
    if (!result.success) {
      setLogoutError(result.error ?? "ออกจากระบบไม่สำเร็จ โปรดลองอีกครั้ง");
    }
  }

  return (
    <ProfilePage
      state={state}
      onEdit={() => router.push("/profile/edit")}
      onReportHistory={() => router.push("/profile/reports")}
      onRedeemHistory={() => router.push("/vouchers")}
      onBadges={() => router.push("/achievements")}
      onLogout={handleLogout}
      loggingOut={auth.isSigningOut}
      logoutError={logoutError}
      onRetry={() => void auth.refresh()}
    />
  );
}
