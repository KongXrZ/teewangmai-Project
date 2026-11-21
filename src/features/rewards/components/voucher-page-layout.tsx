"use client";

import { useEffect, useRef, type ReactNode } from "react";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import { BottomNavigation } from "@/components/layout/bottom-navigation";

export function VoucherPageLayout({
  title,
  onBack,
  focusTitleOnMount,
  children,
}: {
  title: string;
  onBack?: () => void;
  focusTitleOnMount?: boolean;
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
      <main className="flex min-w-0 flex-1 flex-col gap-5 pt-[max(1.5rem,env(safe-area-inset-top,0px))] pr-[max(1.5rem,env(safe-area-inset-right,0px))] pb-[calc(7.625rem+env(safe-area-inset-bottom,0px))] pl-[max(1.5rem,env(safe-area-inset-left,0px))]">
        <header className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="ย้อนกลับ"
              className="-ml-2.5 flex h-11 w-11 cursor-pointer touch-manipulation items-center justify-center rounded-full border-0 bg-transparent text-[#141414] transition-colors duration-150 [-webkit-tap-highlight-color:transparent] hover:bg-[#f0f1f3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e0622a] active:bg-[#e5e7eb]"
            >
              <ArrowBackRounded aria-hidden="true" sx={{ fontSize: 24 }} />
            </button>
          ) : (
            <span aria-hidden="true" />
          )}
          <h1
            ref={titleRef}
            tabIndex={focusTitleOnMount ? -1 : undefined}
            className="truncate text-center text-lg leading-7 font-semibold text-[#141414] outline-none"
          >
            {title}
          </h1>
        </header>
        {children}
      </main>
      <BottomNavigation selected="rewards" />
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
