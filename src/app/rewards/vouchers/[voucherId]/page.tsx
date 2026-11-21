import type { Metadata } from "next";
import { Suspense } from "react";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ProtectedContent } from "@/features/auth/components/guest-state";
import { VoucherDetailContainer } from "@/features/rewards/components/voucher-detail-container";
import { parseVoucherEntrySource } from "@/features/rewards/vouchers";

export const metadata: Metadata = {
  title: "รายละเอียดสิทธิ์ — TeeWangMai?",
};

export default async function VoucherDetail({
  params,
  searchParams,
}: {
  params: Promise<{ voucherId: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const [{ voucherId }, query] = await Promise.all([params, searchParams]);
  const from = typeof query.from === "string" ? query.from : undefined;

  return (
    <MobileShell variant="app">
      <ProtectedContent
        title="รายละเอียดสิทธิ์"
        description="เข้าสู่ระบบเพื่อดูรายละเอียดสิทธิ์และ QR Code สำหรับใช้สิทธิ์"
        selected={parseVoucherEntrySource(from)}
      >
        <Suspense fallback={null}>
          <VoucherDetailContainer voucherId={voucherId} />
        </Suspense>
      </ProtectedContent>
    </MobileShell>
  );
}
