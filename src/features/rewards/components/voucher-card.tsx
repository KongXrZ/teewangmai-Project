"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import CardGiftcardOutlined from "@mui/icons-material/CardGiftcardOutlined";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import KeyboardArrowDownRounded from "@mui/icons-material/KeyboardArrowDownRounded";
import QrCode2Rounded from "@mui/icons-material/QrCode2Rounded";
import {
  formatVoucherDate,
  formatVoucherDateTime,
  getVoucherDetailView,
  getVoucherDisplayStatus,
  getVoucherStatusLabel,
  type VoucherDisplayStatus,
  type VoucherModel,
  type VoucherSelectHandler,
} from "../vouchers";

const pointsFormatter = new Intl.NumberFormat("th-TH");

const statusBadgeClass: Record<VoucherDisplayStatus, string> = {
  available: "bg-[#dcfce7] text-[#166534]",
  used: "bg-[#e5e7eb] text-[#4b5563]",
  expired: "bg-[#fee2e2] text-[#991b1b]",
  unavailable: "bg-[#fef3c7] text-[#92400e]",
};

export function VoucherStatusBadge({
  status,
}: {
  status: VoucherDisplayStatus;
}) {
  return (
    <span
      data-status={status}
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs leading-5 font-semibold ${statusBadgeClass[status]}`}
    >
      {getVoucherStatusLabel(status)}
    </span>
  );
}

export function VoucherImage({
  imageUrl,
  size,
  muted,
}: {
  imageUrl: string | null;
  size: number;
  muted: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = imageUrl !== null && !imageFailed;

  return (
    <span
      style={{ width: size, height: size }}
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg"
    >
      {showImage ? (
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes={`${size}px`}
          unoptimized
          onError={() => setImageFailed(true)}
          ref={(image) => {
            if (image?.complete && image.naturalWidth === 0) {
              setImageFailed(true);
            }
          }}
          className={`object-cover ${muted ? "opacity-50 grayscale" : ""}`}
        />
      ) : (
        <CardGiftcardOutlined
          aria-hidden="true"
          sx={{ fontSize: Math.round(size * 0.78) }}
          className={muted ? "text-[#9ca3af]" : "text-[#e0622a]"}
        />
      )}
    </span>
  );
}

export function VoucherCard({
  voucher,
  onSelect,
  expanded = false,
  onToggle,
  onUseVoucher,
  onShowUseQr,
  hasActiveUseQr = false,
  autoFocus,
}: {
  voucher: VoucherModel;
  onSelect?: VoucherSelectHandler;
  expanded?: boolean;
  onToggle?: VoucherSelectHandler;
  onUseVoucher?: VoucherSelectHandler;
  onShowUseQr?: VoucherSelectHandler;
  hasActiveUseQr?: boolean;
  autoFocus?: boolean;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const detailId = useId();
  const status = getVoucherDisplayStatus(voucher);
  const muted = status !== "available";
  const expandable = onToggle !== undefined;
  const handleHeaderClick = onToggle ?? onSelect;

  useEffect(() => {
    if (autoFocus) {
      buttonRef.current?.focus();
    }
  }, [autoFocus]);

  const detailView = expanded
    ? getVoucherDetailView(voucher, {
        hasQr: false,
        hasUseAction: onUseVoucher !== undefined,
        hasUseQr: hasActiveUseQr,
      })
    : null;

  return (
    <article
      data-status={status}
      data-expanded={expanded || undefined}
      className={`overflow-hidden rounded-2xl border transition-colors duration-150 ${
        expanded
          ? muted
            ? "border-[#d1d5db] bg-[#f7f7f8]"
            : "border-[#e0622a]/50 bg-white shadow-[0_2px_8px_rgb(0_0_0/6%)]"
          : muted
            ? "border-[#e5e7eb] bg-[#f7f7f8]"
            : "border-[#e5e7eb] bg-white shadow-[0_1px_2px_rgb(0_0_0/4%)]"
      }`}
    >
      <button
        ref={buttonRef}
        type="button"
        disabled={handleHeaderClick === undefined}
        onClick={handleHeaderClick ? () => handleHeaderClick(voucher) : undefined}
        aria-expanded={expandable ? expanded : undefined}
        aria-controls={expandable && expanded ? detailId : undefined}
        className="flex min-h-11 w-full cursor-pointer touch-manipulation items-center gap-3.5 border-0 bg-transparent px-4 py-4 text-left transition-colors duration-150 [-webkit-tap-highlight-color:transparent] hover:bg-black/[0.02] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#e0622a] active:bg-black/[0.04] disabled:cursor-default disabled:hover:bg-transparent"
      >
        <VoucherImage imageUrl={voucher.imageUrl} size={36} muted={muted} />
        <span className="flex w-0 min-w-0 flex-1 flex-col items-start gap-1">
          <span
            className={`line-clamp-2 text-[15px] leading-6 font-semibold break-words ${
              muted ? "text-[#6b7280]" : "text-[#141414]"
            }`}
          >
            {voucher.title}
          </span>
          <span className="text-[13px] leading-5 text-[#6b7280]">
            หมดอายุ {formatVoucherDate(voucher.expiresAt)}
          </span>
          <VoucherStatusBadge status={status} />
        </span>
        {expandable ? (
          <KeyboardArrowDownRounded
            aria-hidden="true"
            sx={{ fontSize: 24 }}
            className={`shrink-0 text-[#9ca3af] transition-transform duration-150 ${
              expanded ? "rotate-180 text-[#e0622a]" : ""
            }`}
          />
        ) : (
          onSelect && (
            <ChevronRightRounded
              aria-hidden="true"
              sx={{ fontSize: 24 }}
              className="shrink-0 text-[#9ca3af]"
            />
          )
        )}
      </button>

      {expandable && expanded && detailView && (
        <div
          id={detailId}
          className="border-t border-[#eceef1] px-4 pt-3.5 pb-4"
        >
          <dl className="flex flex-col gap-2">
            <VoucherDetailRow
              label="แต้มที่ใช้"
              value={`${pointsFormatter.format(voucher.usedPoints)} แต้ม`}
            />
            <VoucherDetailRow
              label="วันที่แลก"
              value={formatVoucherDateTime(voucher.redeemedAt)}
            />
            <VoucherDetailRow
              label="หมดอายุ"
              value={formatVoucherDateTime(voucher.expiresAt)}
            />
            {voucher.usedAt != null && (
              <VoucherDetailRow
                label="ใช้เมื่อ"
                value={formatVoucherDateTime(voucher.usedAt)}
              />
            )}
          </dl>

          {detailView.showUseQr && onShowUseQr ? (
            <button
              type="button"
              onClick={() => onShowUseQr(voucher)}
              className="mt-4 flex h-11 w-full cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-xl border-0 bg-[#e0622a] text-[15px] font-semibold text-white transition-colors duration-150 [-webkit-tap-highlight-color:transparent] hover:bg-[#c9531f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e0622a] active:bg-[#b84a1b]"
            >
              <QrCode2Rounded aria-hidden="true" sx={{ fontSize: 20 }} />
              แสดง QR Code
            </button>
          ) : detailView.showUseAction && onUseVoucher ? (
            <button
              type="button"
              onClick={() => onUseVoucher(voucher)}
              className="mt-4 flex h-11 w-full cursor-pointer touch-manipulation items-center justify-center rounded-xl border-0 bg-[#e0622a] text-[15px] font-semibold text-white transition-colors duration-150 [-webkit-tap-highlight-color:transparent] hover:bg-[#c9531f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e0622a] active:bg-[#b84a1b]"
            >
              ใช้สิทธิ์นี้
            </button>
          ) : detailView.notice ? (
            <p
              role="status"
              className="mt-4 flex items-start gap-2 rounded-xl bg-[#f0f1f3] px-3.5 py-2.5 text-[13px] leading-5 text-[#4b5563]"
            >
              <InfoOutlined
                aria-hidden="true"
                sx={{ fontSize: 18 }}
                className="mt-0.5 shrink-0"
              />
              <span className="min-w-0">{detailView.notice}</span>
            </p>
          ) : null}
        </div>
      )}
    </article>
  );
}

function VoucherDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-[13px] leading-5 text-[#6b7280]">{label}</dt>
      <dd className="m-0 min-w-0 text-right text-sm leading-5 font-medium break-words text-[#141414]">
        {value}
      </dd>
    </div>
  );
}

export function VoucherCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex items-center gap-3.5 rounded-2xl border border-[#e5e7eb] bg-white px-4 py-4"
    >
      <span className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-[#eceef1]" />
      <span className="flex flex-1 flex-col gap-2">
        <span className="h-4 w-3/5 animate-pulse rounded bg-[#eceef1]" />
        <span className="h-3 w-2/5 animate-pulse rounded bg-[#eceef1]" />
        <span className="h-5 w-16 animate-pulse rounded-full bg-[#eceef1]" />
      </span>
    </div>
  );
}
