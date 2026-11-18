"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { useAuth } from "@/features/auth/components/auth-provider";
import { updateProfileAction } from "@/features/auth/server/actions";
import {
  EditProfilePage,
  type EditProfileStatus,
  type EditProfileSubmit,
} from "./edit-profile-page";
import {
  PageHeader,
  SkeletonBlock,
  StateMessage,
  pageMainClass,
  primaryButtonClass,
} from "./profile-ui";

const sessionLost = "กรุณาเข้าสู่ระบบก่อนทำรายการ";

export function EditProfileContainer() {
  const router = useRouter();
  const { status: authStatus, user, profile, refresh } = useAuth();
  const [status, setStatus] = useState<EditProfileStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const uploaded = useRef<{ userId: string; file: File; url: string } | null>(null);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.replace("/login?next=%2Fprofile%2Fedit");
  }, [authStatus, router]);

  function fail(message: string | null) {
    setErrorMessage(message);
    setStatus("failed");
  }

  async function uploadAvatar(file: File, userId: string) {
    const cached = uploaded.current;
    if (cached?.userId === userId && cached.file === file) return cached.url;
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/profile/avatar", {
      method: "POST",
      body,
      credentials: "same-origin",
    });
    const result = (await response.json().catch(() => null)) as {
      success?: boolean;
      data?: { avatar_url?: string };
      error?: string;
    } | null;
    if (response.ok && result?.success && result.data?.avatar_url) {
      uploaded.current = { userId, file, url: result.data.avatar_url };
      return result.data.avatar_url;
    }
    if (response.status === 401) void refresh();
    fail([400, 401, 413, 415].includes(response.status) ? (result?.error ?? null) : null);
    return null;
  }

  async function save({ name, avatarFile }: EditProfileSubmit, userId: string) {
    setErrorMessage(null);
    setStatus("saving");
    try {
      const avatarUrl = avatarFile ? await uploadAvatar(avatarFile, userId) : undefined;
      if (avatarUrl === null) return;
      const result = await updateProfileAction(
        avatarUrl === undefined ? { name } : { name, avatar_url: avatarUrl },
      );
      if (!result.success) {
        if (result.error === sessionLost) void refresh();
        fail(result.error === sessionLost ? sessionLost : null);
        return;
      }
      uploaded.current = null;
      await refresh();
      setStatus("saved");
    } catch {
      fail(null);
    }
  }

  const back = () => router.push("/profile");

  if (authStatus === "authenticated" && user && profile) {
    return (
      <EditProfilePage
        key={user.id}
        initial={{
          name: profile.name,
          email: profile.email || user.email || "",
          avatarUrl: profile.avatar_url,
        }}
        status={status}
        errorMessage={errorMessage}
        onSubmit={(values) => void save(values, user.id)}
        onBack={back}
        onCancel={back}
        onDone={back}
        onDismissError={() => setStatus("idle")}
      />
    );
  }

  const failed = authStatus === "error" || authStatus === "authenticated";

  return (
    <>
      <main aria-busy={!failed || undefined} className={pageMainClass}>
        <PageHeader title="แก้ไขข้อมูลส่วนตัว" onBack={back} />
        {failed ? (
          <StateMessage
            role="alert"
            tone="danger"
            icon={<WarningAmberRounded aria-hidden="true" sx={{ fontSize: 40 }} />}
            title="โหลดข้อมูลโปรไฟล์ไม่สำเร็จ"
            description="ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต แล้วลองอีกครั้ง"
          >
            <button type="button" onClick={() => void refresh()} className={primaryButtonClass}>
              ลองอีกครั้ง
            </button>
          </StateMessage>
        ) : (
          <div className="mt-6 flex flex-col gap-5">
            <SkeletonBlock className="h-6 w-40 rounded-md" />
            <SkeletonBlock className="mx-auto h-24 w-24 rounded-full" />
            <SkeletonBlock className="h-[52px] w-full rounded-[14px]" />
            <SkeletonBlock className="h-[52px] w-full rounded-[14px]" />
          </div>
        )}
      </main>
      <BottomNavigation selected="profile" />
    </>
  );
}
