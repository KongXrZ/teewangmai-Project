"use client";

import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { RewardsCatalog, type RewardsCatalogProps } from "./rewards-catalog";

export type RewardsPageProps = RewardsCatalogProps;

export function RewardsPage({ vouchersHref, ...props }: RewardsPageProps) {
  return (
    <>
      <main className="flex min-w-0 flex-1 flex-col px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-[calc(7.625rem+env(safe-area-inset-bottom,0px))] text-black min-[400px]:px-[22px]">
        <header className="flex gap-1.5 pl-1.5">
          <span
            aria-hidden="true"
            className="mt-1.5 h-[55px] w-2 shrink-0 rounded-full bg-[#ff5815]"
          />
          <div className="min-w-0">
            <h1 className="text-[clamp(2rem,8vw,2.375rem)] leading-[1.2] font-bold">
              แลกรางวัล
            </h1>
            <p className="text-base leading-snug font-medium text-[#878787]">
              สะสมแต้มจากการรายงานเพื่อแลกของรางวัล
            </p>
          </div>
        </header>
        <div className="mt-5 px-1.5">
          <RewardsCatalog {...props} vouchersHref={vouchersHref} />
        </div>
      </main>
      <BottomNavigation selected="rewards" />
    </>
  );
}
