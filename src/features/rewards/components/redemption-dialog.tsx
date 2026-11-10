"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from "react";
import Dialog from "@mui/material/Dialog";
import CircularProgress from "@mui/material/CircularProgress";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import ErrorOutlineRounded from "@mui/icons-material/ErrorOutlineRounded";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import StarRounded from "@mui/icons-material/StarRounded";
import {
  getCloseReason,
  getRedemptionView,
  type RedemptionCloseReason,
  type RedemptionConfirmHandler,
  type RedemptionResult,
  type RedemptionStep,
} from "../redemption";
import type { RewardCardModel } from "../types";
import { RedemptionQrArea } from "./redemption-qr-area";

const pointsFormatter = new Intl.NumberFormat("th-TH");

export interface RedemptionDialogProps {
  open: boolean;
  /** Reward selected from the catalog (FE-009 `RedemptionFlowProps.reward`). */
  reward: RewardCardModel | null;
  /** Current balance from the server; `null` hides the balance row. */
  points: number | null;
  /** Explicit outcome from the caller. The dialog never resolves itself. */
  result: RedemptionResult;
  /** Fired once per attempt; ignored while a submit is in flight. */
  onConfirm: RedemptionConfirmHandler;
  onClose: (reason: RedemptionCloseReason) => void;
  /**
   * QR content for the success state. Pass only backend-confirmed QR
   * (one-time token + expiry contract from BE-010). Omitted = no QR area.
   */
  qr?: ReactNode;
}

const resultCopy: Record<
  Exclude<RedemptionStep, "confirm">,
  { title: string; description: string }
> = {
  success: {
    title: "แลกรางวัลสำเร็จ",
    description: "ระบบยืนยันการแลกรางวัลของคุณแล้ว",
  },
  insufficient_points: {
    title: "แต้มไม่พอ",
    description: "แต้มของคุณไม่พอสำหรับรางวัลนี้",
  },
  unavailable: {
    title: "รางวัลนี้แลกไม่ได้ตอนนี้",
    description: "รางวัลอาจหมดหรือปิดการแลกแล้ว โปรดเลือกรางวัลอื่น",
  },
  failure: {
    title: "แลกรางวัลไม่สำเร็จ",
    description: "เกิดข้อผิดพลาด โปรดลองใหม่อีกครั้ง",
  },
};

const primaryButton =
  "flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-0 bg-[#e0622a] text-[15px] font-semibold text-white transition-colors duration-150 touch-manipulation [-webkit-tap-highlight-color:transparent] hover:bg-[#c9531f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e0622a] active:bg-[#b84a1b] aria-disabled:cursor-not-allowed aria-disabled:bg-[#f0a27f] aria-disabled:hover:bg-[#f0a27f]";

const secondaryButton =
  "flex h-11 w-full cursor-pointer items-center justify-center rounded-xl border border-[#e5e7eb] bg-white text-[15px] font-semibold text-[#141414] transition-colors duration-150 touch-manipulation [-webkit-tap-highlight-color:transparent] hover:bg-[#f7f7f8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e0622a] active:bg-[#f0f1f3] aria-disabled:cursor-not-allowed aria-disabled:text-[#9ca3af] aria-disabled:hover:bg-white";

export function RedemptionDialog({
  open,
  reward,
  points,
  result,
  onConfirm,
  onClose,
  qr,
}: RedemptionDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const view = getRedemptionView(result);
  const submitLockRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const isOpen = open && reward !== null;

  useRestoreFocus(isOpen);

  // A new result (or reopening) releases the lock so retry works; the lock
  // itself covers the gap before the caller reports `pending`.
  useEffect(() => {
    submitLockRef.current = false;
  }, [result, isOpen, reward?.id]);

  useEffect(() => {
    if (isOpen && view.step !== "confirm") {
      headingRef.current?.focus();
    }
  }, [isOpen, view.step]);

  function submit() {
    if (!reward || view.pending || submitLockRef.current) {
      return;
    }
    if (!view.canConfirm && !view.canRetry) {
      return;
    }
    submitLockRef.current = true;
    onConfirm(reward);
  }

  function dismiss() {
    if (view.canDismiss) {
      onClose(getCloseReason(result));
    }
  }

  return (
    <Dialog
      open={isOpen}
      onClose={dismiss}
      disableRestoreFocus
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      slotProps={{
        paper: {
          "aria-busy": view.pending || undefined,
          className:
            "!m-4 !w-full !max-w-[340px] !rounded-3xl !bg-white !shadow-[0_12px_40px_rgb(0_0_0/18%)] min-[360px]:!m-6",
        },
        backdrop: { className: "!bg-black/40" },
      }}
    >
      {reward && (
        <div className="flex flex-col px-5 pt-5 pb-6 text-[#141414]">
          <div className="flex items-start justify-between gap-3">
            <h2
              id={titleId}
              ref={headingRef}
              tabIndex={-1}
              className="flex min-w-0 items-center gap-2 text-base leading-6 font-semibold outline-none"
            >
              {view.step !== "confirm" && <ResultIcon step={view.step} />}
              {view.step === "confirm"
                ? "ยืนยันการแลกรางวัล"
                : resultCopy[view.step].title}
            </h2>
            <button
              type="button"
              onClick={dismiss}
              aria-label="ปิด"
              aria-disabled={!view.canDismiss || undefined}
              className="-mt-1 -mr-1.5 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-[#6b7280] hover:bg-[#f0f1f3] focus-visible:outline-2 focus-visible:outline-[#e0622a] aria-disabled:cursor-not-allowed aria-disabled:opacity-40"
            >
              <CloseRounded aria-hidden="true" sx={{ fontSize: 22 }} />
            </button>
          </div>

          <RewardSummary reward={reward} />

          {view.step === "confirm" ? (
            <>
              {points !== null && <BalanceRow points={points} />}
              <p
                id={descriptionId}
                className="mt-4 text-center text-[13px] leading-5 text-[#6b7280]"
              >
                ต้องการใช้แต้มแลกรางวัลนี้หรือไม่
              </p>
              <span role="status" className="sr-only">
                {view.pending ? "กำลังแลกรางวัล" : ""}
              </span>
              <div className="mt-5 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={submit}
                  aria-disabled={view.pending || undefined}
                  className={primaryButton}
                >
                  {view.pending && (
                    <CircularProgress
                      aria-hidden="true"
                      size={18}
                      thickness={5}
                      sx={{ color: "white" }}
                    />
                  )}
                  {view.pending ? "กำลังแลก…" : "ยืนยันการแลก"}
                </button>
                <button
                  type="button"
                  onClick={dismiss}
                  aria-disabled={!view.canDismiss || undefined}
                  className={secondaryButton}
                >
                  ยกเลิก
                </button>
              </div>
            </>
          ) : (
            <>
              <p
                id={descriptionId}
                role={view.step === "success" ? "status" : "alert"}
                className="mt-4 text-center text-[13px] leading-5 text-[#6b7280]"
              >
                {("message" in result && result.message) ||
                  resultCopy[view.step].description}
              </p>

              {view.step === "success" && qr !== undefined && (
                <RedemptionQrArea>{qr}</RedemptionQrArea>
              )}

              <div className="mt-5 flex flex-col gap-2.5">
                {view.canRetry && (
                  <button
                    type="button"
                    onClick={submit}
                    className={primaryButton}
                  >
                    ลองใหม่
                  </button>
                )}
                <button
                  type="button"
                  onClick={dismiss}
                  className={view.canRetry ? secondaryButton : primaryButton}
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </Dialog>
  );
}

function RewardSummary({ reward }: { reward: RewardCardModel }) {
  return (
    <div className="mt-3 rounded-xl bg-[#fdf1eb] px-4 py-3">
      <p className="text-[15px] leading-6 font-semibold break-words">
        {reward.title}
      </p>
      <p className="text-[13px] leading-5 text-[#6b7280]">
        ใช้ {pointsFormatter.format(reward.pointsRequired)} แต้ม
      </p>
    </div>
  );
}

function BalanceRow({ points }: { points: number }) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-[#f0f1f3] px-4 py-3">
      <span className="flex items-center gap-1.5 text-[13px] leading-5 text-[#6b7280]">
        <StarRounded
          aria-hidden="true"
          sx={{ fontSize: 18 }}
          className="text-[#e0622a]"
        />
        แต้มของคุณ
      </span>
      <span className="text-[15px] leading-6 font-semibold text-[#e0622a]">
        {pointsFormatter.format(points)} แต้ม
      </span>
    </div>
  );
}

function ResultIcon({ step }: { step: Exclude<RedemptionStep, "confirm"> }) {
  if (step === "success") {
    return (
      <CheckCircleRounded
        aria-hidden="true"
        sx={{ fontSize: 22 }}
        className="shrink-0 text-[#16a34a]"
      />
    );
  }
  if (step === "failure") {
    return (
      <ErrorOutlineRounded
        aria-hidden="true"
        sx={{ fontSize: 22 }}
        className="shrink-0 text-[#dc2626]"
      />
    );
  }
  return (
    <InfoOutlined
      aria-hidden="true"
      sx={{ fontSize: 22 }}
      className="shrink-0 text-[#b45309]"
    />
  );
}

/**
 * Remembers the element focused when the dialog opened (e.g. the "แลก" button)
 * and returns focus to it after the dialog closes or unmounts. Runs in a
 * layout effect so it captures the trigger before MUI moves focus inside.
 */
function useRestoreFocus(open: boolean) {
  const triggerRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    const active = document.activeElement;
    triggerRef.current = active instanceof HTMLElement ? active : null;

    return () => {
      const trigger = triggerRef.current;
      triggerRef.current = null;
      if (trigger) {
        setTimeout(() => {
          if (trigger.isConnected) {
            trigger.focus();
          }
        }, 0);
      }
    };
  }, [open]);
}
