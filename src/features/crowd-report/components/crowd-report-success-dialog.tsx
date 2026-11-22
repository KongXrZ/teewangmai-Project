"use client";

import { useId, useRef } from "react";
import Dialog from "@mui/material/Dialog";
import CheckRounded from "@mui/icons-material/CheckRounded";
import { formatRecordedAt, getCrowdLevelLabel } from "../crowd-report";
import type { CrowdReportRecord } from "../types";

export interface CrowdReportSuccessDialogProps {
  record: CrowdReportRecord | null;
  onDone: () => void;
  onViewHistory?: () => void;
}

export function CrowdReportSuccessDialog({
  record,
  onDone,
  onViewHistory,
}: CrowdReportSuccessDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const open = record !== null;
  const recordedAt = record ? formatRecordedAt(record.recordedAt) : null;

  return (
    <Dialog
      open={open}
      onClose={onDone}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      slotProps={{
        paper: {
          className:
            "!m-4 !w-full !max-w-[404px] !rounded-3xl !bg-white !shadow-[0_10px_32px_rgb(0_0_0/15%)] min-[360px]:!m-6",
        },
        backdrop: { className: "!bg-black/40" },
        transition: { onEntered: () => headingRef.current?.focus() },
      }}
    >
      {record && (
        <div className="flex flex-col items-center gap-6 px-5 pt-8 pb-5 text-center min-[360px]:px-7">
          <span
            aria-hidden="true"
            className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-[#218150] text-white"
          >
            <CheckRounded sx={{ fontSize: 52 }} />
          </span>

          <div className="flex w-full flex-col gap-2">
            <h2
              id={titleId}
              ref={headingRef}
              tabIndex={-1}
              className="text-[clamp(1.375rem,6vw,1.6875rem)] leading-[1.4] font-bold text-[#17243a] outline-none"
            >
              เช็คอินสำเร็จแล้ว
            </h2>
            <p
              id={descriptionId}
              role="status"
              className="text-base leading-normal text-[#697386]"
            >
              คุณได้เช็คอินที่สถานที่นี้เรียบร้อยแล้ว
            </p>
            <dl className="mt-1 flex flex-col gap-1 rounded-2xl bg-[#fdf1eb] px-4 py-3 text-[15px] leading-6 text-[#17243a]">
              <div className="flex flex-wrap justify-center gap-x-1.5">
                <dt className="sr-only">สถานที่</dt>
                <dd className="font-semibold break-words">
                  {record.buildingName} · {record.floorLabel}
                </dd>
              </div>
              <div className="flex flex-wrap justify-center gap-x-1.5">
                <dt>ระดับความหนาแน่น</dt>
                <dd className="font-semibold">
                  {record.level} {getCrowdLevelLabel(record.level)}
                </dd>
              </div>
            </dl>
            {recordedAt && (
              <p className="text-[15px] leading-[1.6] text-[#697386]">
                {recordedAt}
              </p>
            )}
          </div>

          <div className="flex w-full flex-col gap-2">
            <button
              type="button"
              onClick={onDone}
              className="flex h-14 w-full cursor-pointer touch-manipulation items-center justify-center rounded-[14px] border-0 bg-[#ea580c] text-lg font-semibold text-white transition-colors duration-150 [-webkit-tap-highlight-color:transparent] hover:bg-[#d24f0b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#081828] active:bg-[#bb460a]"
            >
              ตกลง
            </button>
            {onViewHistory && (
              <button
                type="button"
                onClick={onViewHistory}
                className="flex h-11 w-full cursor-pointer touch-manipulation items-center justify-center rounded-[14px] border-0 bg-transparent text-base font-semibold text-[#ea580c] transition-colors duration-150 [-webkit-tap-highlight-color:transparent] hover:bg-[#fff1ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#081828] active:bg-[#ffe2d4]"
              >
                ดูประวัติ
              </button>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}
