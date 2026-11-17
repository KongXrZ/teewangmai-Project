import type { Metadata } from "next";
import { MobileShell } from "@/components/layout/mobile-shell";
import { CheckInFlow } from "@/features/crowd-report/components/check-in-flow";

export const metadata: Metadata = {
  title: "เช็คอิน — TeeWangMai?",
};

export default function Scan() {
  return (
    <MobileShell variant="app">
      <CheckInFlow />
    </MobileShell>
  );
}
