import type { Metadata } from "next";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ProtectedContent } from "@/features/auth/components/guest-state";
import { VoucherCollectionContainer } from "@/features/rewards/components/voucher-collection-container";

export const metadata: Metadata = {
  title: "สิทธิ์ของฉัน — TeeWangMai?",
};

export default function Vouchers() {
  return (
    <MobileShell variant="app">
      <ProtectedContent
        title="สิทธิ์ของฉัน"
        description="เข้าสู่ระบบเพื่อดูสิทธิ์ที่แลกไว้และใช้สิทธิ์ที่ร้านค้า"
        selected="rewards"
      >
        <VoucherCollectionContainer />
      </ProtectedContent>
    </MobileShell>
  );
}
