import type { Metadata } from "next";
import { MobileShell } from "@/components/layout/mobile-shell";
import { RewardsRedemptionContainer } from "@/features/rewards/components/rewards-redemption-container";

export const metadata: Metadata = {
  title: "แลกรางวัล — TeeWangMai?",
};

export default function Rewards() {
  return (
    <MobileShell variant="app">
      <RewardsRedemptionContainer />
    </MobileShell>
  );
}
