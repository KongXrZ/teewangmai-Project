"use client";

import { BottomNavigation } from "@/components/layout/bottom-navigation";
import {
  PageHeader,
  pageMainClass,
} from "@/features/profile/components/profile-ui";
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
      <main className={pageMainClass}>
        <PageHeader title="ความสำเร็จ" onBack={onBack} />
        <div className="mt-5 flex flex-1 flex-col gap-5">
          <BadgeCollection {...collectionProps} />
        </div>
      </main>
      <BadgeDetailDialog badge={selectedBadge} onClose={onCloseBadge} />
      <BottomNavigation selected="profile" />
    </>
  );
}
