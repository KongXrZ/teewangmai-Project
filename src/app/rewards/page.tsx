import type { Metadata } from "next";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ProtectedContent } from "@/features/auth/components/guest-state";
import { RewardsRedemptionContainer } from "@/features/rewards/components/rewards-redemption-container";

export const metadata: Metadata = {
  title: "แลกรางวัล — TeeWangMai?",
};

export default function Rewards() {
  return (
    <MobileShell variant="app">
      <ProtectedContent
        title="แลกรางวัล"
        description="เข้าสู่ระบบเพื่อดูแต้มสะสมและแลกรางวัลจากการรายงานของคุณ"
        selected="rewards"
      >
        <RewardsRedemptionContainer />
      </ProtectedContent>
    </MobileShell>
  );
}
