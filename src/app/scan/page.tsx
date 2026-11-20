import type { Metadata } from "next";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ProtectedContent } from "@/features/auth/components/guest-state";
import { CheckInFlow } from "@/features/crowd-report/components/check-in-flow";

export const metadata: Metadata = {
  title: "เช็คอิน — TeeWangMai?",
};

export default function Scan() {
  return (
    <MobileShell variant="app">
      <ProtectedContent
        title="เช็คอิน"
        description="เข้าสู่ระบบเพื่อสแกน QR Code ประจำชั้นและรายงานความหนาแน่น"
        selected="scan"
        waitForAuth
      >
        <CheckInFlow />
      </ProtectedContent>
    </MobileShell>
  );
}
