import type { ReactNode } from "react";

export type VoucherId = number;

export type VoucherStatus = "available" | "used" | "expired";

export type VoucherDisplayStatus = VoucherStatus | "unavailable";

export interface VoucherModel {
  id: VoucherId;
  title: string;
  imageUrl: string | null;
  usedPoints: number;
  redeemedAt: string;
  expiresAt: string;
  usedAt: string | null;
  status: VoucherStatus | "unknown";
}

export type VoucherCollectionState =
  | { status: "loading" }
  | { status: "error"; message?: string; onRetry?: () => void }
  | { status: "ready"; vouchers: VoucherModel[] };

export type VoucherDetailState =
  | { status: "loading" }
  | { status: "error"; message?: string; onRetry?: () => void }
  | { status: "empty"; message?: string }
  | {
      status: "ready";
      voucher: VoucherModel;
      qr?: ReactNode;
      useQr?: ReactNode;
    };

export type VoucherSelectHandler = (voucher: VoucherModel) => void;

export interface VoucherDetailView {
  status: VoucherDisplayStatus;
  label: string;
  notice: string | null;
  showQr: boolean;
  showUseQr: boolean;
  showUseAction: boolean;
  showQrPending: boolean;
}

const statusCopy: Record<
  VoucherDisplayStatus,
  { label: string; notice: string | null }
> = {
  available: { label: "พร้อมใช้", notice: null },
  used: { label: "ใช้แล้ว", notice: "สิทธิ์นี้ถูกใช้แล้ว ไม่สามารถใช้ซ้ำได้" },
  expired: { label: "หมดอายุ", notice: "สิทธิ์นี้หมดอายุแล้ว ไม่สามารถใช้ได้" },
  unavailable: { label: "ใช้ไม่ได้", notice: "สิทธิ์นี้ยังใช้ไม่ได้ในขณะนี้" },
};

export function getVoucherDisplayStatus(
  voucher: Pick<VoucherModel, "status" | "usedAt">,
): VoucherDisplayStatus {
  if (voucher.usedAt != null || voucher.status === "used") {
    return "used";
  }
  if (voucher.status === "expired") {
    return "expired";
  }
  return voucher.status === "available" ? "available" : "unavailable";
}

export function getVoucherStatusLabel(status: VoucherDisplayStatus): string {
  return statusCopy[status].label;
}

export function getVoucherDetailView(
  voucher: Pick<VoucherModel, "status" | "usedAt">,
  {
    hasQr,
    hasUseAction,
    hasUseQr = false,
  }: { hasQr: boolean; hasUseAction: boolean; hasUseQr?: boolean },
): VoucherDetailView {
  const status = getVoucherDisplayStatus(voucher);
  const ready = status === "available";
  const showUseQr = status === "used" && hasUseQr;

  return {
    status,
    ...statusCopy[status],
    notice: showUseQr ? null : statusCopy[status].notice,
    showQr: ready && hasQr,
    showUseQr,
    showUseAction: ready && !hasQr && hasUseAction,
    showQrPending: ready && !hasQr && !hasUseAction,
  };
}

const VOUCHER_DATE_FALLBACK = "ไม่ระบุ";

const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Bangkok",
});

const timeFormatter = new Intl.DateTimeFormat("th-TH", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Asia/Bangkok",
});

export function formatVoucherDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? VOUCHER_DATE_FALLBACK
    : dateFormatter.format(date);
}

export function formatVoucherDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? VOUCHER_DATE_FALLBACK
    : `${dateFormatter.format(date)} ${timeFormatter.format(date)} น.`;
}
