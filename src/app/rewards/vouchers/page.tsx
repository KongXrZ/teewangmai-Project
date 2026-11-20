import type { Metadata } from "next";
import { MobileShell } from "@/components/layout/mobile-shell";
import { VoucherCollectionContainer } from "@/features/rewards/components/voucher-collection-container";

export const metadata: Metadata = {
  title: "สิทธิ์ของฉัน — TeeWangMai?",
};

export default function Vouchers() {
  return (
    <MobileShell variant="app">
      <VoucherCollectionContainer />
    </MobileShell>
  );
}
