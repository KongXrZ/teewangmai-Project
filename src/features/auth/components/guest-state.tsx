"use client";

import { Fragment, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import PersonOutlineRounded from "@mui/icons-material/PersonOutlineRounded";
import {
  BottomNavigation,
  type NavigationItemId,
} from "@/components/layout/bottom-navigation";
import { useAuth } from "@/features/auth/components/auth-provider";
import { getSafeRedirectPath } from "@/features/auth/redirects";
import {
  StateMessage,
  pageMainClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/features/profile/components/profile-ui";
import { Spinner } from "@/features/quick-scan/components/spinner";

const pageTopClass = "pt-[max(2rem,env(safe-area-inset-top,0px))]";

export function GuestState({ description }: { description: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const loginHref = `/login?next=${encodeURIComponent(getSafeRedirectPath(pathname))}`;

  return (
    <StateMessage
      tone="brand"
      icon={<PersonOutlineRounded aria-hidden="true" sx={{ fontSize: 44 }} />}
      title="ยังไม่ได้เข้าสู่ระบบ"
      description={description}
    >
      <button
        type="button"
        onClick={() => router.push(loginHref)}
        className={primaryButtonClass}
      >
        เข้าสู่ระบบ
      </button>
      <button
        type="button"
        onClick={() => router.push("/signup")}
        className={secondaryButtonClass}
      >
        สมัคร
      </button>
    </StateMessage>
  );
}

export function ProtectedContent({
  title,
  description,
  selected,
  waitForAuth = false,
  children,
}: {
  title: string;
  description: string;
  selected: NavigationItemId;
  waitForAuth?: boolean;
  children: ReactNode;
}) {
  const { status, user } = useAuth();
  const [ownerId, setOwnerId] = useState<string | null>(null);

  if (status === "authenticated" && user && user.id !== ownerId) {
    setOwnerId(user.id);
  }

  if (status === "unauthenticated" || (waitForAuth && status === "loading")) {
    const pending = status === "loading";
    return (
      <>
        <main
          aria-busy={pending || undefined}
          className={`${pageMainClass} ${pageTopClass} ${pending ? "items-center justify-center" : ""}`}
        >
          <h1 className="sr-only">{title}</h1>
          {pending ? (
            <>
              <span role="status" className="sr-only">
                กำลังตรวจสอบการเข้าสู่ระบบ
              </span>
              <Spinner className="h-8 w-8 border-[3px] border-[#ea580c]/25 border-t-[#ea580c]" />
            </>
          ) : (
            <GuestState description={description} />
          )}
        </main>
        <BottomNavigation selected={selected} />
      </>
    );
  }

  return <Fragment key={ownerId ?? "pending"}>{children}</Fragment>;
}
