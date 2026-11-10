"use client";

import { useId, useState } from "react";
import Dialog from "@mui/material/Dialog";
import CloseRounded from "@mui/icons-material/CloseRounded";
import type { BadgeModel } from "../types";
import { formatEarnedDate, getRequirementText, isEarned } from "../view-model";
import { BadgeIcon } from "./badge-icon";

export interface BadgeDetailDialogProps {
  /** Selected badge from the server catalog; `null` keeps the dialog closed. */
  badge: BadgeModel | null;
  onClose: () => void;
}

export function BadgeDetailDialog({ badge, onClose }: BadgeDetailDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  // Keep the last badge rendered while the dialog fades out.
  const [shownBadge, setShownBadge] = useState(badge);
  if (badge !== null && badge !== shownBadge) {
    setShownBadge(badge);
  }

  return (
    <Dialog
      open={badge !== null}
      onClose={onClose}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      slotProps={{
        paper: {
          className:
            "!m-6 !w-[calc(100%-3rem)] !max-w-[380px] !rounded-2xl !shadow-[0_12px_32px_rgb(0_0_0/18%)]",
        },
      }}
    >
      {shownBadge && (
        <BadgeDetail
          badge={shownBadge}
          onClose={onClose}
          titleId={titleId}
          descriptionId={descriptionId}
        />
      )}
    </Dialog>
  );
}

function BadgeDetail({
  badge,
  onClose,
  titleId,
  descriptionId,
}: {
  badge: BadgeModel;
  onClose: () => void;
  titleId: string;
  descriptionId: string;
}) {
  const earned = isEarned(badge);
  const earnedDate = earned ? formatEarnedDate(badge.earnedAt) : null;

  return (
    <div className="flex flex-col px-5 pt-4 pb-5">
      <div className="flex items-start justify-between gap-3">
        <h2
          id={titleId}
          className="min-w-0 pt-1 text-base leading-6 font-semibold break-words text-[#141414]"
        >
          {badge.name}
        </h2>
        <button
          type="button"
          aria-label="ปิด"
          onClick={onClose}
          className="-mr-1.5 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-[#6b7280] hover:bg-[#f0f1f3] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#e0622a]"
        >
          <CloseRounded aria-hidden="true" sx={{ fontSize: 22 }} />
        </button>
      </div>

      <div className="mt-3 flex flex-col items-center gap-3 rounded-xl bg-[#f7f7f8] px-4 py-6">
        <BadgeIcon iconUrl={badge.iconUrl} earned={earned} size={96} />
        <span
          className={`rounded-full px-3 py-1 text-xs leading-4 font-semibold ${
            earned
              ? "bg-[#fde7dc] text-[#c9531f]"
              : "bg-[#e5e7eb] text-[#4b5563]"
          }`}
        >
          {earned ? "ได้รับแล้ว" : "ยังไม่ได้รับ"}
        </span>
      </div>

      <dl
        id={descriptionId}
        className="mt-4 flex flex-col gap-3 text-sm leading-5"
      >
        {badge.description && (
          <div>
            <dt className="sr-only">รายละเอียด</dt>
            <dd className="text-[#374151]">{badge.description}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs leading-4 font-semibold text-[#6b7280]">
            เงื่อนไข
          </dt>
          <dd className="mt-1 text-[#141414]">{getRequirementText(badge)}</dd>
        </div>
        {earnedDate && (
          <div>
            <dt className="text-xs leading-4 font-semibold text-[#6b7280]">
              ได้รับเมื่อ
            </dt>
            <dd className="mt-1 text-[#141414]">
              <time dateTime={badge.earnedAt!}>{earnedDate}</time>
            </dd>
          </div>
        )}
      </dl>

      <button
        type="button"
        onClick={onClose}
        className="mt-5 flex h-11 w-full cursor-pointer touch-manipulation items-center justify-center rounded-xl border-0 bg-[#e0622a] text-[15px] font-semibold text-white transition-colors duration-150 [-webkit-tap-highlight-color:transparent] hover:bg-[#c9531f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e0622a] active:bg-[#b84a1b]"
      >
        ปิดหน้าต่าง
      </button>
    </div>
  );
}
