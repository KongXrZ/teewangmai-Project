import type { Metadata } from "next";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ReportHistoryContainer } from "@/features/profile/components/report-history-container";

export const metadata: Metadata = {
  title: "ประวัติการรายงาน — TeeWangMai?",
};

export default function ReportHistory() {
  return (
    <MobileShell variant="app">
      <ReportHistoryContainer />
    </MobileShell>
  );
}
