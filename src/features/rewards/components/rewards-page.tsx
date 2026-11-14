"use client";

import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { RewardsCatalog, type RewardsCatalogProps } from "./rewards-catalog";

export function RewardsPage(props: RewardsCatalogProps) {
  return (
    <>
      <main className="flex min-w-0 flex-1 flex-col bg-[#fafafa] px-6 pt-[max(2.75rem,env(safe-area-inset-top,0px))] pb-[calc(7.625rem+env(safe-area-inset-bottom,0px))] sm:px-8">
        <h1 className="sr-only">แลกรางวัล</h1>
        <RewardsCatalog {...props} />
      </main>
      <BottomNavigation selected="rewards" />
    </>
  );
}
