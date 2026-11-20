"use client";

import { useId } from "react";
import Dialog from "@mui/material/Dialog";
import type { VoucherModel } from "../vouchers";

export function VoucherUseConfirmDialog({
  voucher,
  onConfirm,
  onClose,
}: {
  voucher: VoucherModel | null;
  onConfirm: (voucher: VoucherModel) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <Dialog
      open={voucher !== null}
      onClose={onClose}
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
            ยืนยันการใช้สิทธิ์
          </h2>
          <p className="mt-3 rounded-xl bg-[#fdf1eb] px-4 py-3 text-[15px] leading-6 font-semibold break-words">
            {voucher.title}
          </p>
          <p
            id={descriptionId}
            className="mt-4 text-center text-[13px] leading-5 text-[#6b7280]"
          >
            เมื่อยืนยันแล้วสิทธิ์จะถูกใช้ทันที โปรดยื่น QR Code
            ให้พนักงานสแกนภายใน 30 นาที
          </p>
          <div className="mt-5 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => onConfirm(voucher)}
              className="flex h-11 w-full cursor-pointer touch-manipulation items-center justify-center rounded-xl border-0 bg-[#e0622a] text-[15px] font-semibold text-white transition-colors duration-150 [-webkit-tap-highlight-color:transparent] hover:bg-[#c9531f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e0622a] active:bg-[#b84a1b]"
            >
              ยืนยันใช้สิทธิ์
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-full cursor-pointer touch-manipulation items-center justify-center rounded-xl border border-[#e5e7eb] bg-white text-[15px] font-semibold text-[#141414] transition-colors duration-150 [-webkit-tap-highlight-color:transparent] hover:bg-[#f7f7f8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e0622a] active:bg-[#f0f1f3]"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
