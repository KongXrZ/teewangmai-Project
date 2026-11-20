import type { Metadata } from "next";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ProtectedContent } from "@/features/auth/components/guest-state";
import { ReportHistoryContainer } from "@/features/profile/components/report-history-container";

export const metadata: Metadata = {
  title: "ประวัติการรายงาน — TeeWangMai?",
};

export default function ReportHistory() {
  return (
    <MobileShell variant="app">
      <ProtectedContent
        title="ประวัติการรายงาน"
        description="เข้าสู่ระบบเพื่อดูประวัติการรายงานความหนาแน่นของคุณ"
        selected="profile"
      >
        <ReportHistoryContainer />
      </ProtectedContent>
    </MobileShell>
  );
}
