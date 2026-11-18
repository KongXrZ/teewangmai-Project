import type { Metadata } from "next";
import { MobileShell } from "@/components/layout/mobile-shell";
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
      <VoucherDetailContainer voucherId={voucherId} />
    </MobileShell>
  );
}
