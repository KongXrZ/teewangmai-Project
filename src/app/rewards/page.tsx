import type { Metadata } from "next";
import { MobileShell } from "@/components/layout/mobile-shell";
import { RewardsPage } from "@/features/rewards/components/rewards-page";

export const metadata: Metadata = {
  title: "แลกรางวัล — TeeWangMai?",
};

export default function Rewards() {
  return (
    <MobileShell variant="app">
      <RewardsPage state={{ status: "unavailable" }} />
    </MobileShell>
  );
}
