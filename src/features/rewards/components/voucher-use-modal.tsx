"use client";

import { useId } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import type { VoucherModel } from "../vouchers";
import { VoucherQrCode } from "./voucher-qr-code";

export interface VoucherUseModalProps {
  voucher: VoucherModel | null;
  useCode: string | null;
  usePending?: boolean;
  useError?: string;
  onConfirm: (voucher: VoucherModel) => void;
  onClose: () => void;
}

export function VoucherUseModal({
  voucher,
  useCode,
  usePending = false,
  useError,
  onConfirm,
  onClose,
}: VoucherUseModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const isQrStep = useCode !== null;

  function handleDialogClose(
    _event: object,
    reason: "backdropClick" | "escapeKeyDown",
  ) {
    if (usePending) {
      return;
    }
    if (isQrStep && (reason === "backdropClick" || reason === "escapeKeyDown")) {
      return;
    }
    onClose();
  }

  return (
    <Dialog
      open={voucher !== null}
      onClose={handleDialogClose}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      slotProps={{
        paper: {
          className:
            "!m-4 !w-full !max-w-[340px] !rounded-3xl !bg-white !shadow-[0_12px_40px_rgb(0_0_0/18%)] min-[360px]:!m-6",
        },
        backdrop: { className: "!bg-black/40" },
      }}
    >
      {voucher && (
        <div className="flex flex-col px-5 pt-5 pb-6 text-[#141414]">
          <h2 id={titleId} className="text-base leading-6 font-semibold">
            {isQrStep ? "QR Code สำหรับใช้สิทธิ์" : "ยืนยันการใช้สิทธิ์"}
          </h2>

          <p className="mt-3 rounded-xl bg-[#fdf1eb] px-4 py-3 text-[15px] leading-6 font-semibold break-words">
            {voucher.title}
          </p>

          {isQrStep ? (
            <>
              <div className="mt-4 flex flex-col items-center">
                <div className="flex aspect-square w-full max-w-[200px] items-center justify-center rounded-2xl bg-[#f0f1f3] p-3">
                  <VoucherQrCode code={useCode} />
                </div>
                <p
                  id={descriptionId}
                  className="mt-3 text-center text-[13px] leading-5 text-[#6b7280]"
                >
                  ยื่น QR Code นี้ให้พนักงานสแกนภายใน 30 นาที
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 flex h-11 w-full cursor-pointer touch-manipulation items-center justify-center rounded-xl border border-[#e5e7eb] bg-white text-[15px] font-semibold text-[#141414] transition-colors duration-150 [-webkit-tap-highlight-color:transparent] hover:bg-[#f7f7f8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e0622a] active:bg-[#f0f1f3]"
              >
                ปิด
              </button>
            </>
          ) : (
            <>
              <p
                id={descriptionId}
                className="mt-4 text-center text-[13px] leading-5 text-[#6b7280]"
              >
                เมื่อยืนยันแล้วสิทธิ์จะถูกใช้ทันที โปรดยื่น QR Code
                ให้พนักงานสแกนภายใน 30 นาที
              </p>

              {useError && (
                <p
                  role="alert"
                  className="mt-3 text-center text-[13px] leading-5 text-[#b91c1c]"
                >
                  {useError}
                </p>
              )}

              <div className="mt-5 flex flex-col gap-2.5">
                <button
                  type="button"
                  disabled={usePending}
                  onClick={() => onConfirm(voucher)}
                  className="flex h-11 w-full cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-xl border-0 bg-[#e0622a] text-[15px] font-semibold text-white transition-colors duration-150 [-webkit-tap-highlight-color:transparent] hover:bg-[#c9531f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e0622a] active:bg-[#b84a1b] disabled:cursor-not-allowed disabled:bg-[#f0a27f] disabled:hover:bg-[#f0a27f]"
                >
                  {usePending && (
                    <CircularProgress
                      aria-hidden="true"
                      size={18}
                      thickness={5}
                      sx={{ color: "white" }}
                    />
                  )}
                  {usePending ? "กำลังดำเนินการ…" : "ยืนยันใช้สิทธิ์"}
                </button>
                <button
                  type="button"
                  disabled={usePending}
                  onClick={onClose}
                  className="flex h-11 w-full cursor-pointer touch-manipulation items-center justify-center rounded-xl border border-[#e5e7eb] bg-white text-[15px] font-semibold text-[#141414] transition-colors duration-150 [-webkit-tap-highlight-color:transparent] hover:bg-[#f7f7f8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e0622a] active:bg-[#f0f1f3] disabled:cursor-not-allowed disabled:text-[#9ca3af]"
                >
                  ยกเลิก
                </button>
              </div>
              <span role="status" className="sr-only">
                {usePending ? "กำลังดำเนินการ" : ""}
              </span>
            </>
          )}
        </div>
      )}
    </Dialog>
  );
}
