import type { Metadata } from "next";
import { MobileShell } from "@/components/layout/mobile-shell";
import { RewardsCatalogContainer } from "@/features/rewards/components/rewards-catalog-container";

export const metadata: Metadata = {
  title: "แลกรางวัล — TeeWangMai?",
};

export default function Rewards() {
  return (
    <MobileShell variant="app">
      <RewardsCatalogContainer />
    </MobileShell>
  );
}
