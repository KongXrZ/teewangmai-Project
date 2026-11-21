import type { Metadata } from "next";
import { Suspense } from "react";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ProtectedContent } from "@/features/auth/components/guest-state";
import { VoucherDetailContainer } from "@/features/rewards/components/voucher-detail-container";

export const metadata: Metadata = {
  title: "รายละเอียดสิทธิ์ — TeeWangMai?",
};

export default async function VoucherDetail({
  params,
}: {
  params: Promise<{ voucherId: string }>;
}) {
  const { voucherId } = await params;

  return (
    <MobileShell variant="app">
      <ProtectedContent
        title="รายละเอียดสิทธิ์"
        description="เข้าสู่ระบบเพื่อดูรายละเอียดสิทธิ์และ QR Code สำหรับใช้สิทธิ์"
        selected="rewards"
      >
        <Suspense fallback={null}>
          <VoucherDetailContainer voucherId={voucherId} />
        </Suspense>
      </ProtectedContent>
    </MobileShell>
  );
}
