"use client";

import { BottomNavigation } from "@/components/layout/bottom-navigation";
import type { BadgeModel } from "../types";
import { BadgeCollection, type BadgeCollectionProps } from "./badge-collection";
import { BadgeDetailDialog } from "./badge-detail-dialog";

export interface AchievementsPageProps extends BadgeCollectionProps {
  selectedBadge: BadgeModel | null;
  onCloseBadge: () => void;
}

export function AchievementsPage({
  selectedBadge,
  onCloseBadge,
  ...collectionProps
}: AchievementsPageProps) {
  return (
    <>
      <main className="flex min-w-0 flex-1 flex-col gap-5 bg-white px-5 pt-[max(1.5rem,env(safe-area-inset-top,0px))] pb-[calc(7.625rem+env(safe-area-inset-bottom,0px))] sm:px-8">
        <h1 className="rounded-xl bg-[#f0f1f3] px-4 py-2.5 text-center text-base leading-6 font-semibold text-[#141414]">
          ความสำเร็จ
        </h1>
        <BadgeCollection {...collectionProps} />
      </main>
      <BadgeDetailDialog badge={selectedBadge} onClose={onCloseBadge} />
      <BottomNavigation selected="rewards" />
    </>
  );
}
