import type { Metadata } from "next";
import { MobileShell } from "@/components/layout/mobile-shell";
import { QuickScanPage } from "@/features/quick-scan/components/quick-scan-page";

export const metadata: Metadata = {
  title: "เช็คอิน — TeeWangMai?",
};

export default function Scan() {
  return (
    <MobileShell variant="app">
      <QuickScanPage />
    </MobileShell>
  );
}
