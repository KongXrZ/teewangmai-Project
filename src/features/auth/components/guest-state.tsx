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
  initialContentOwner,
  markRenderedWithoutUser,
  nextContentOwner,
} from "./content-owner";
import {
  StateMessage,
  pageMainClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/features/profile/components/profile-ui";

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
  loading,
  children,
}: {
  title: string;
  description: string;
  selected: NavigationItemId;
  loading?: ReactNode;
  children: ReactNode;
}) {
  const { status, user } = useAuth();
  const [owner, setOwner] = useState(initialContentOwner);

  if (status === "authenticated" && user && user.id !== owner.id) {
    setOwner(nextContentOwner(owner, user.id));
  } else if (status === "error" && markRenderedWithoutUser(owner) !== owner) {
    setOwner(markRenderedWithoutUser(owner));
  }

  if (status === "loading" && loading) {
    return loading;
  }

  if (status === "unauthenticated") {
    return (
      <>
        <main className={`${pageMainClass} pt-[max(2rem,env(safe-area-inset-top,0px))]`}>
          <h1 className="sr-only">{title}</h1>
          <GuestState description={description} />
        </main>
        <BottomNavigation selected={selected} />
      </>
    );
  }

  return <Fragment key={owner.generation}>{children}</Fragment>;
}
