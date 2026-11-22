import type { Metadata } from "next";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ProtectedContent } from "@/features/auth/components/guest-state";
import { AchievementsContainer } from "@/features/achievements/components/achievements-container";

export const metadata: Metadata = {
  title: "ความสำเร็จ — TeeWangMai?",
};

export default function Achievements() {
  return (
    <MobileShell variant="app">
      <ProtectedContent
        title="ความสำเร็จ"
        description="เข้าสู่ระบบเพื่อดูแบดจ์ที่คุณได้รับและแบดจ์ที่ยังรอปลดล็อก"
        selected="profile"
      >
        <AchievementsContainer />
      </ProtectedContent>
    </MobileShell>
  );
}
