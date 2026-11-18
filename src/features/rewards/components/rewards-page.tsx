"use client";

import Link from "next/link";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { RewardsCatalog, type RewardsCatalogProps } from "./rewards-catalog";

export interface RewardsPageProps extends RewardsCatalogProps {
  vouchersHref?: string;
}

export function RewardsPage({ vouchersHref, ...props }: RewardsPageProps) {
  return (
    <>
      <main className="flex min-w-0 flex-1 flex-col bg-[#fafafa] px-6 pt-[max(2.75rem,env(safe-area-inset-top,0px))] pb-[calc(7.625rem+env(safe-area-inset-bottom,0px))] sm:px-8">
        <h1 className="sr-only">แลกรางวัล</h1>
        {vouchersHref && (
          <Link
            href={vouchersHref}
            className="mb-2 -mr-2 flex min-h-11 items-center self-end rounded-lg pl-2 text-sm font-semibold text-[#c9531f] no-underline touch-manipulation hover:text-[#b84a1b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e0622a]"
          >
            สิทธิ์ของฉัน
            <ChevronRightRounded aria-hidden="true" sx={{ fontSize: 20 }} />
          </Link>
        )}
        <RewardsCatalog {...props} />
      </main>
      <BottomNavigation selected="rewards" />
    </>
  );
}
