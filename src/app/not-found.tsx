import type { Metadata } from "next";
import Link from "next/link";
import SearchOffRounded from "@mui/icons-material/SearchOffRounded";
import { MobileShell } from "@/components/layout/mobile-shell";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import {
  StateMessage,
  pageMainClass,
  primaryButtonClass,
} from "@/features/profile/components/profile-ui";

export const metadata: Metadata = {
  title: "ไม่พบหน้านี้ — TeeWangMai?",
};

export default function NotFound() {
  return (
    <MobileShell variant="app">
      <main
        className={`${pageMainClass} pt-[max(2rem,env(safe-area-inset-top,0px))]`}
      >
        <h1 className="sr-only">ไม่พบหน้านี้</h1>
        <StateMessage
          tone="brand"
          icon={<SearchOffRounded aria-hidden="true" sx={{ fontSize: 44 }} />}
          title="ไม่พบหน้าที่คุณต้องการ"
          description="หน้านี้อาจถูกย้ายหรือไม่มีอยู่แล้ว ลองกลับไปที่หน้าแรกเพื่อเริ่มใหม่"
        >
          <Link href="/" className={primaryButtonClass}>
            กลับหน้าแรก
          </Link>
        </StateMessage>
      </main>
      <BottomNavigation />
    </MobileShell>
  );
}
