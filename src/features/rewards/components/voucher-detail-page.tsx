"use client";

import CircularProgress from "@mui/material/CircularProgress";
import ErrorOutlineRounded from "@mui/icons-material/ErrorOutlineRounded";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import SearchOffRounded from "@mui/icons-material/SearchOffRounded";
import type { ReactNode } from "react";
import {
  formatVoucherDateTime,
  getVoucherDetailView,
  type VoucherDetailState,
  type VoucherModel,
  type VoucherSelectHandler,
} from "../vouchers";
import { CatalogMessage } from "./rewards-catalog";
import { RedemptionQrArea } from "./redemption-qr-area";
import { VoucherImage, VoucherStatusBadge } from "./voucher-card";
import { VoucherMessageButton, VoucherPageLayout } from "./voucher-page-layout";

const pointsFormatter = new Intl.NumberFormat("th-TH");

export interface VoucherDetailPageProps {
  state: VoucherDetailState;
  onBack?: () => void;
  onUseVoucher?: VoucherSelectHandler;
  usePending?: boolean;
  useError?: string;
}

export function VoucherDetailPage({
  state,
  onBack,
  onUseVoucher,
  usePending,
  useError,
}: VoucherDetailPageProps) {
  return (
    <VoucherPageLayout
      title="รายละเอียดสิทธิ์"
      onBack={onBack}
      focusTitleOnMount
    >
      <VoucherDetailContent
        state={state}
        onBack={onBack}
        onUseVoucher={onUseVoucher}
        usePending={usePending}
        useError={useError}
      />
    </VoucherPageLayout>
  );
}

function VoucherDetailContent({
  state,
  onBack,
  onUseVoucher,
  usePending,
  useError,
}: VoucherDetailPageProps) {
  switch (state.status) {
    case "loading":
      return (
        <div
          aria-busy="true"
          className="flex flex-col gap-4 rounded-2xl border border-[#e5e7eb] bg-white p-5"
        >
          <span className="h-14 w-14 animate-pulse rounded-lg bg-[#eceef1]" />
          <span className="h-5 w-3/5 animate-pulse rounded bg-[#eceef1]" />
          <span className="h-4 w-full animate-pulse rounded bg-[#eceef1]" />
          <span className="h-4 w-4/5 animate-pulse rounded bg-[#eceef1]" />
          <span className="sr-only" role="status">
            กำลังโหลดรายละเอียดสิทธิ์
          </span>
        </div>
      );
    case "error":
      return (
        <CatalogMessage
          role="alert"
          icon={
            <ErrorOutlineRounded aria-hidden="true" sx={{ fontSize: 40 }} />
          }
          title="โหลดรายละเอียดไม่สำเร็จ"
          description={state.message ?? "เกิดข้อผิดพลาด โปรดลองใหม่อีกครั้ง"}
          action={
            state.onRetry && (
              <VoucherMessageButton onClick={state.onRetry}>
                ลองใหม่
              </VoucherMessageButton>
            )
          }
        />
      );
    case "empty":
      return (
        <CatalogMessage
          icon={<SearchOffRounded aria-hidden="true" sx={{ fontSize: 40 }} />}
          title="ไม่พบสิทธิ์นี้"
          description={state.message ?? "สิทธิ์นี้อาจไม่มีอยู่ในคลังของคุณแล้ว"}
          action={
            onBack && (
              <VoucherMessageButton onClick={onBack}>
                กลับไปคลังสิทธิ์
              </VoucherMessageButton>
            )
          }
        />
      );
    case "ready":
      return (
        <ReadyVoucherDetail
          key={state.voucher.id}
          voucher={state.voucher}
          qr={state.qr}
          onUseVoucher={onUseVoucher}
          usePending={usePending}
          useError={useError}
        />
      );
  }
}

function ReadyVoucherDetail({
  voucher,
  qr,
  onUseVoucher,
  usePending,
  useError,
}: {
  voucher: VoucherModel;
  qr?: ReactNode;
  onUseVoucher?: VoucherSelectHandler;
  usePending?: boolean;
  useError?: string;
}) {
  const view = getVoucherDetailView(voucher, {
    hasQr: qr !== undefined && qr !== null,
    hasUseAction: onUseVoucher !== undefined,
  });

  function handleUse() {
    if (!usePending) {
      onUseVoucher?.(voucher);
    }
  }

  return (
    <article
      data-status={view.status}
      className="flex flex-col rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/4%)]"
    >
      <div className="flex items-start gap-3.5">
        <VoucherImage
          imageUrl={voucher.imageUrl}
          size={56}
          muted={view.status !== "available"}
        />
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
          <h2 className="text-base leading-6 font-semibold break-words text-[#141414]">
            {voucher.title}
          </h2>
          <VoucherStatusBadge status={view.status} />
        </div>
      </div>

      <dl className="mt-4 flex flex-col gap-2.5 border-t border-[#eceef1] pt-4">
        <DetailRow
          label="แต้มที่ใช้"
          value={`${pointsFormatter.format(voucher.usedPoints)} แต้ม`}
        />
        <DetailRow
          label="วันที่แลก"
          value={formatVoucherDateTime(voucher.redeemedAt)}
        />
        <DetailRow
          label="หมดอายุ"
          value={formatVoucherDateTime(voucher.expiresAt)}
        />
        {voucher.usedAt != null && (
          <DetailRow
            label="ใช้เมื่อ"
            value={formatVoucherDateTime(voucher.usedAt)}
          />
        )}
      </dl>

      {view.notice && (
        <p
          role="status"
          className="mt-5 flex items-start gap-2 rounded-xl bg-[#f0f1f3] px-4 py-3 text-sm leading-5 text-[#4b5563]"
        >
          <InfoOutlined
            aria-hidden="true"
            sx={{ fontSize: 20 }}
            className="shrink-0"
          />
          <span className="min-w-0">{view.notice}</span>
        </p>
      )}

      {view.showQr && <RedemptionQrArea>{qr}</RedemptionQrArea>}

      {view.showQrPending && (
        <p
          role="status"
          className="mt-5 rounded-xl bg-[#f0f1f3] px-4 py-3 text-center text-sm leading-5 text-[#4b5563]"
        >
          QR Code ยังไม่พร้อมแสดง
        </p>
      )}

      {view.showUseAction && (
        <div className="mt-5 flex flex-col gap-2">
          {useError && (
            <p
              role="alert"
              className="text-center text-[13px] leading-5 text-[#b91c1c]"
            >
              {useError}
            </p>
          )}
          <button
            type="button"
            onClick={handleUse}
            aria-disabled={usePending || undefined}
            className="flex h-11 w-full cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-xl border-0 bg-[#e0622a] text-[15px] font-semibold text-white transition-colors duration-150 [-webkit-tap-highlight-color:transparent] hover:bg-[#c9531f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e0622a] active:bg-[#b84a1b] aria-disabled:cursor-not-allowed aria-disabled:bg-[#f0a27f] aria-disabled:hover:bg-[#f0a27f]"
          >
            {usePending && (
              <CircularProgress
                aria-hidden="true"
                size={18}
                thickness={5}
                sx={{ color: "white" }}
              />
            )}
            {usePending ? "กำลังดำเนินการ…" : "ใช้สิทธิ์นี้"}
          </button>
          <span role="status" className="sr-only">
            {usePending ? "กำลังดำเนินการ" : ""}
          </span>
        </div>
      )}
    </article>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-[13px] leading-5 text-[#6b7280]">{label}</dt>
      <dd className="m-0 min-w-0 text-right text-sm leading-5 font-medium break-words text-[#141414]">
        {value}
      </dd>
    </div>
  );
}
