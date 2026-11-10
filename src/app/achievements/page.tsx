import type { Metadata } from "next";
import { MobileShell } from "@/components/layout/mobile-shell";
import { AchievementsContainer } from "@/features/achievements/components/achievements-container";

export const metadata: Metadata = {
  title: "ความสำเร็จ — TeeWangMai?",
};

export default function Achievements() {
  return (
    <MobileShell variant="app">
      <AchievementsContainer />
    </MobileShell>
  );
}
