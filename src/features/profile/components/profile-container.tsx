"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/components/auth-provider";
import { ProfilePage } from "./profile-page";
import type { ProfileState } from "./profile-view-models";

export function ProfileContainer() {
  const router = useRouter();
  const auth = useAuth();
  const [logoutError, setLogoutError] = useState<string | null>(null);

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
        reportCount: 0,
        badgeCount: 0,
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
      onLogin={() => router.push("/login?next=%2Fprofile")}
      onSignup={() => router.push("/signup")}
    />
  );
}
