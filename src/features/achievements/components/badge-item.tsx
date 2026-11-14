"use client";

import type { BadgeModel, BadgeSelectHandler } from "../types";
import { isEarned } from "../view-model";
import { BadgeIcon } from "./badge-icon";

export interface BadgeItemProps {
  badge: BadgeModel;
  onSelect?: BadgeSelectHandler;
}

export function BadgeItem({ badge, onSelect }: BadgeItemProps) {
  const earned = isEarned(badge);

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-label={`${badge.name} — ${earned ? "ได้รับแล้ว" : "ยังไม่ได้รับ"}`}
      onClick={onSelect ? () => onSelect(badge) : undefined}
      disabled={!onSelect}
      data-earned={earned}
      className="flex min-w-0 cursor-pointer touch-manipulation flex-col items-center gap-1.5 rounded-xl border-0 bg-transparent px-1 py-2 transition-colors duration-150 [-webkit-tap-highlight-color:transparent] hover:bg-[#f0f1f3] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#e0622a] active:bg-[#e8eaed] disabled:cursor-default disabled:hover:bg-transparent"
    >
      <BadgeIcon iconUrl={badge.iconUrl} earned={earned} />
      <span
        className={`line-clamp-2 w-full text-center text-xs leading-4 break-words ${
          earned ? "text-[#141414]" : "text-[#6b7280]"
        }`}
      >
        {badge.name}
      </span>
    </button>
  );
}

export function BadgeItemSkeleton() {
  return (
    <span
      aria-hidden="true"
      className="flex flex-col items-center gap-1.5 py-2"
    >
      <span className="h-14 w-14 animate-pulse rounded-full bg-[#e5e7eb]" />
      <span className="h-3 w-12 animate-pulse rounded bg-[#e5e7eb]" />
    </span>
  );
}
