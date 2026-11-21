"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import {
  PageHeader,
  pageMainClass,
} from "@/features/profile/components/profile-ui";
import type { VoucherEntrySource } from "../vouchers";

export function VoucherPageLayout({
  title,
  onBack,
  focusTitleOnMount,
  entrySource = "rewards",
  children,
}: {
  title: string;
  onBack?: () => void;
  focusTitleOnMount?: boolean;
  entrySource?: VoucherEntrySource;
  children: ReactNode;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (focusTitleOnMount) {
      titleRef.current?.focus();
    }
  }, [focusTitleOnMount]);

  return (
    <>
      <main className={pageMainClass}>
        <PageHeader
          title={title}
          onBack={onBack}
          titleRef={titleRef}
          focusTitleOnMount={focusTitleOnMount}
        />
        <div className="mt-5 flex flex-1 flex-col gap-5">{children}</div>
      </main>
      <BottomNavigation selected={entrySource} />
    </>
  );
}

export function VoucherMessageButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 h-11 cursor-pointer touch-manipulation rounded-lg border-0 bg-[#e0622a] px-5 text-sm font-semibold text-white transition-colors duration-150 [-webkit-tap-highlight-color:transparent] hover:bg-[#c9531f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e0622a] active:bg-[#b84a1b]"
    >
      {children}
    </button>
  );
}
