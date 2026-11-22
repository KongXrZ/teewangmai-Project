"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useVoucherCollection } from "../hooks/use-vouchers";
import {
  parseVoucherEntrySource,
  parseVoucherIdParam,
  resolveVoucherCollectionBackHref,
  type VoucherId,
  type VoucherModel,
} from "../vouchers";
import { VoucherCollectionPage } from "./voucher-collection-page";
import { VoucherUseModal } from "./voucher-use-modal";

export function VoucherCollectionContainer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const entrySource = parseVoucherEntrySource(from);
  const requestedVoucherId = parseVoucherIdParam(searchParams.get("voucher"));

  const { state, activeUses, usePending, useError, clearUseError, submitUse } =
    useVoucherCollection();

  const [expandedVoucherId, setExpandedVoucherId] = useState<VoucherId | null>(
    requestedVoucherId,
  );
  const [syncedRequestedId, setSyncedRequestedId] = useState<VoucherId | null>(
    requestedVoucherId,
  );
  if (requestedVoucherId !== syncedRequestedId) {
    setSyncedRequestedId(requestedVoucherId);
    if (requestedVoucherId !== null) {
      setExpandedVoucherId(requestedVoucherId);
    }
  }

  const [modalVoucherId, setModalVoucherId] = useState<VoucherId | null>(null);

  const activeUseVoucherIds = useMemo(
    () => new Set(Object.keys(activeUses).map(Number)),
    [activeUses],
  );

  const modalVoucher: VoucherModel | null =
    state.status === "ready" && modalVoucherId !== null
      ? (state.vouchers.find((item) => item.id === modalVoucherId) ?? null)
      : null;

  const modalUseCode =
    modalVoucher !== null ? (activeUses[modalVoucher.id]?.useCode ?? null) : null;

  function handleToggleVoucher(voucher: VoucherModel) {
    setExpandedVoucherId((current) =>
      current === voucher.id ? null : voucher.id,
    );
  }

  function handleOpenUseModal(voucher: VoucherModel) {
    clearUseError();
    setModalVoucherId(voucher.id);
  }

  function handleCloseModal() {
    clearUseError();
    setModalVoucherId(null);
  }

  return (
    <>
      <VoucherCollectionPage
        state={state}
        entrySource={entrySource}
        expandedVoucherId={expandedVoucherId}
        focusVoucherId={requestedVoucherId ?? undefined}
        activeUseVoucherIds={activeUseVoucherIds}
        onToggleVoucher={handleToggleVoucher}
        onUseVoucher={handleOpenUseModal}
        onShowUseQr={handleOpenUseModal}
        onBack={() => router.push(resolveVoucherCollectionBackHref(from))}
        onBrowseRewards={() => router.push("/rewards")}
      />
      <VoucherUseModal
        voucher={modalVoucher}
        useCode={modalUseCode}
        usePending={usePending}
        useError={useError}
        onConfirm={submitUse}
        onClose={handleCloseModal}
      />
    </>
  );
}
