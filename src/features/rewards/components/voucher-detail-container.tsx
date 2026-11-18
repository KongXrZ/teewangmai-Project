"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useVoucherDetail } from "../hooks/use-vouchers";
import type { VoucherDetailState, VoucherId, VoucherModel } from "../vouchers";
import { VoucherDetailPage } from "./voucher-detail-page";
import { VoucherQrCode } from "./voucher-qr-code";
import { VoucherUseConfirmDialog } from "./voucher-use-confirm-dialog";

function parseVoucherId(value: string): VoucherId | null {
  if (!/^[1-9]\d*$/.test(value)) {
    return null;
  }
  const id = Number(value);
  return Number.isSafeInteger(id) && id <= 2147483647 ? id : null;
}

export function VoucherDetailContainer({ voucherId }: { voucherId: string }) {
  const router = useRouter();
  const { state, useCode, usePending, useError, submitUse } = useVoucherDetail(
    parseVoucherId(voucherId),
  );
  const [confirming, setConfirming] = useState<VoucherModel | null>(null);

  const viewState: VoucherDetailState =
    state.status === "ready" && useCode
      ? { ...state, useQr: <VoucherQrCode code={useCode} /> }
      : state;

  return (
    <>
      <VoucherDetailPage
        state={viewState}
        onBack={() => router.push("/rewards/vouchers")}
        onUseVoucher={setConfirming}
        usePending={usePending}
        useError={useError}
      />
      <VoucherUseConfirmDialog
        voucher={confirming}
        onClose={() => setConfirming(null)}
        onConfirm={(voucher) => {
          setConfirming(null);
          submitUse(voucher);
        }}
      />
    </>
  );
}
