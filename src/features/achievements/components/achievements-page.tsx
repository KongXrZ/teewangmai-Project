"use client";

import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import type { BadgeModel } from "../types";
import { BadgeCollection, type BadgeCollectionProps } from "./badge-collection";
import { BadgeDetailDialog } from "./badge-detail-dialog";

export interface AchievementsPageProps extends BadgeCollectionProps {
  selectedBadge: BadgeModel | null;
  onCloseBadge: () => void;
  onBack?: () => void;
}

export function AchievementsPage({
  selectedBadge,
  onCloseBadge,
  onBack,
  ...collectionProps
}: AchievementsPageProps) {
  return (
    <>
      <main className="flex min-w-0 flex-1 flex-col gap-5 bg-white px-5 pt-[max(1.5rem,env(safe-area-inset-top,0px))] pb-[calc(7.625rem+env(safe-area-inset-bottom,0px))] sm:px-8">
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
          <h1 className="rounded-xl bg-[#f0f1f3] px-4 py-2.5 text-center text-base leading-6 font-semibold text-[#141414]">
            ความสำเร็จ
          </h1>
          <span aria-hidden="true" />
        </header>
        <BadgeCollection {...collectionProps} />
      </main>
      <BadgeDetailDialog badge={selectedBadge} onClose={onCloseBadge} />
      <BottomNavigation selected="profile" />
    </>
  );
}
