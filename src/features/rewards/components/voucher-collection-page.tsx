"use client";

import CardGiftcardOutlined from "@mui/icons-material/CardGiftcardOutlined";
import ErrorOutlineRounded from "@mui/icons-material/ErrorOutlineRounded";
import { GuestState } from "@/features/auth/components/guest-state";
import type {
  VoucherCollectionState,
  VoucherEntrySource,
  VoucherId,
  VoucherSelectHandler,
} from "../vouchers";
import { CatalogMessage } from "./rewards-catalog";
import { VoucherCard, VoucherCardSkeleton } from "./voucher-card";
import { VoucherMessageButton, VoucherPageLayout } from "./voucher-page-layout";

export interface VoucherCollectionPageProps {
  state: VoucherCollectionState;
  onSelectVoucher?: VoucherSelectHandler;
  expandedVoucherId?: VoucherId | null;
  onToggleVoucher?: VoucherSelectHandler;
  onUseVoucher?: VoucherSelectHandler;
  onShowUseQr?: VoucherSelectHandler;
  activeUseVoucherIds?: ReadonlySet<VoucherId>;
  onBack?: () => void;
  onBrowseRewards?: () => void;
  focusVoucherId?: VoucherId;
  entrySource?: VoucherEntrySource;
}

export function VoucherCollectionPage({
  state,
  onSelectVoucher,
  expandedVoucherId,
  onToggleVoucher,
  onUseVoucher,
  onShowUseQr,
  activeUseVoucherIds,
  onBack,
  onBrowseRewards,
  focusVoucherId,
  entrySource = "rewards",
}: VoucherCollectionPageProps) {
  return (
    <VoucherPageLayout
      title="สิทธิ์ของฉัน"
      onBack={onBack}
      entrySource={entrySource}
    >
      <VoucherCollectionContent
        state={state}
        onSelectVoucher={onSelectVoucher}
        expandedVoucherId={expandedVoucherId}
        onToggleVoucher={onToggleVoucher}
        onUseVoucher={onUseVoucher}
        onShowUseQr={onShowUseQr}
        activeUseVoucherIds={activeUseVoucherIds}
        onBrowseRewards={onBrowseRewards}
        focusVoucherId={focusVoucherId}
      />
    </VoucherPageLayout>
  );
}

function VoucherCollectionContent({
  state,
  onSelectVoucher,
  expandedVoucherId,
  onToggleVoucher,
  onUseVoucher,
  onShowUseQr,
  activeUseVoucherIds,
  onBrowseRewards,
  focusVoucherId,
}: Omit<VoucherCollectionPageProps, "onBack" | "entrySource">) {
  switch (state.status) {
    case "loading":
      return (
        <div aria-busy="true" className="flex flex-col gap-3">
          <VoucherCardSkeleton />
          <VoucherCardSkeleton />
          <VoucherCardSkeleton />
          <span className="sr-only" role="status">
            กำลังโหลดสิทธิ์ของคุณ
          </span>
        </div>
      );
    case "unauthenticated":
      return <GuestState description="เข้าสู่ระบบเพื่อดูสิทธิ์ที่แลกไว้และใช้สิทธิ์ที่ร้านค้า" />;
    case "error":
      return (
        <CatalogMessage
          role="alert"
          icon={
            <ErrorOutlineRounded aria-hidden="true" sx={{ fontSize: 40 }} />
          }
          title="โหลดสิทธิ์ไม่สำเร็จ"
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
    case "ready":
      if (state.vouchers.length === 0) {
        return (
          <CatalogMessage
            icon={
              <CardGiftcardOutlined aria-hidden="true" sx={{ fontSize: 40 }} />
            }
            title="ยังไม่มีสิทธิ์ที่แลกไว้"
            description="เมื่อแลกรางวัลแล้ว สิทธิ์ของคุณจะแสดงที่นี่"
            action={
              onBrowseRewards && (
                <VoucherMessageButton onClick={onBrowseRewards}>
                  ไปแลกรางวัล
                </VoucherMessageButton>
              )
            }
          />
        );
      }
      return (
        <ul className="flex list-none flex-col gap-3 p-0">
          {state.vouchers.map((voucher) => (
            <li key={voucher.id}>
              <VoucherCard
                voucher={voucher}
                onSelect={onSelectVoucher}
                expanded={expandedVoucherId === voucher.id}
                onToggle={onToggleVoucher}
                onUseVoucher={onUseVoucher}
                onShowUseQr={onShowUseQr}
                hasActiveUseQr={activeUseVoucherIds?.has(voucher.id) ?? false}
                autoFocus={voucher.id === focusVoucherId}
              />
            </li>
          ))}
        </ul>
      );
  }
}
