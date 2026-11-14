"use client";

import { useState } from "react";
import Image from "next/image";
import CardGiftcardOutlined from "@mui/icons-material/CardGiftcardOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import type {
  RewardAvailability,
  RewardCardModel,
  RewardSelectHandler,
} from "../types";

const pointsFormatter = new Intl.NumberFormat("th-TH");

const availabilityNote: Partial<Record<RewardAvailability, string>> = {
  insufficient_points: "แต้มไม่พอ",
  out_of_stock: "หมดแล้ว",
  unavailable: "ยังแลกไม่ได้",
};

export interface RewardCardProps {
  reward: RewardCardModel;
  onSelect?: RewardSelectHandler;
  disabled?: boolean;
}

export function RewardCard({ reward, onSelect, disabled }: RewardCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const locked = reward.availability === "upcoming";
  const redeemable = reward.availability === "redeemable";
  const canSelect = redeemable && !disabled && onSelect !== undefined;
  const note = availabilityNote[reward.availability];
  const showImage = reward.imageUrl !== null && !imageFailed;
  const FallbackIcon = locked ? LockOutlined : CardGiftcardOutlined;

  return (
    <article
      data-availability={reward.availability}
      className={`flex items-center gap-3.5 rounded-2xl px-4 py-5 ${
        locked
          ? "bg-[#f0f1f3]"
          : "border border-[#e5e7eb] bg-white shadow-[0_1px_2px_rgb(0_0_0/4%)]"
      }`}
    >
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg">
        {showImage ? (
          <Image
            src={reward.imageUrl!}
            alt=""
            fill
            sizes="36px"
            unoptimized
            onError={() => setImageFailed(true)}
            ref={(image) => {
              if (image?.complete && image.naturalWidth === 0) {
                setImageFailed(true);
              }
            }}
            className={`object-cover ${locked ? "opacity-50 grayscale" : ""}`}
          />
        ) : (
          <FallbackIcon
            aria-hidden="true"
            sx={{ fontSize: 28 }}
            className={locked ? "text-[#9ca3af]" : "text-[#e0622a]"}
          />
        )}
      </span>

      <div className="w-0 min-w-0 flex-1">
        <h3
          className={`truncate text-[15px] leading-6 font-semibold ${
            locked ? "font-normal text-[#6b7280]" : "text-[#141414]"
          }`}
        >
          {reward.title}
        </h3>
        {!locked && (
          <p className="text-[13px] leading-5 text-[#6b7280]">
            ใช้ {pointsFormatter.format(reward.pointsRequired)} แต้ม
            {note && <span className="text-[#b45309]"> · {note}</span>}
          </p>
        )}
      </div>

      <button
        type="button"
        disabled={!canSelect}
        aria-label={`แลก ${reward.title}`}
        onClick={canSelect ? () => onSelect(reward) : undefined}
        className="h-11 min-w-[52px] shrink-0 cursor-pointer touch-manipulation rounded-lg border-0 bg-[#e0622a] px-3.5 text-sm font-semibold text-white transition-colors duration-150 [-webkit-tap-highlight-color:transparent] hover:bg-[#c9531f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e0622a] active:bg-[#b84a1b] disabled:cursor-not-allowed disabled:bg-[#e2e4e8] disabled:text-[#9ca3af]"
      >
        แลก
      </button>
    </article>
  );
}

export function RewardCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex items-center gap-3.5 rounded-2xl border border-[#e5e7eb] bg-white px-4 py-5"
    >
      <span className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-[#eceef1]" />
      <span className="flex flex-1 flex-col gap-2">
        <span className="h-4 w-3/5 animate-pulse rounded bg-[#eceef1]" />
        <span className="h-3 w-1/4 animate-pulse rounded bg-[#eceef1]" />
      </span>
      <span className="h-11 w-[52px] animate-pulse rounded-lg bg-[#eceef1]" />
    </div>
  );
}
