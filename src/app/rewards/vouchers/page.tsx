import type { Metadata } from "next";
import { Suspense } from "react";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ProtectedContent } from "@/features/auth/components/guest-state";
import { VoucherCollectionContainer } from "@/features/rewards/components/voucher-collection-container";
import { parseVoucherEntrySource } from "@/features/rewards/vouchers";

export const metadata: Metadata = {
  title: "สิทธิ์ของฉัน — TeeWangMai?",
};

export default async function Vouchers({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const query = await searchParams;
  const from = typeof query.from === "string" ? query.from : undefined;

  return (
    <MobileShell variant="app">
      <ProtectedContent
        title="สิทธิ์ของฉัน"
        description="เข้าสู่ระบบเพื่อดูสิทธิ์ที่แลกไว้และใช้สิทธิ์ที่ร้านค้า"
        selected={parseVoucherEntrySource(from)}
      >
        <Suspense fallback={null}>
          <VoucherCollectionContainer />
        </Suspense>
      </ProtectedContent>
    </MobileShell>
  );
}
