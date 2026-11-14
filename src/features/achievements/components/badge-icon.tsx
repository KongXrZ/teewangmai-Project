"use client";

import { useState } from "react";
import Image from "next/image";
import EmojiEventsRounded from "@mui/icons-material/EmojiEventsRounded";
import LockRounded from "@mui/icons-material/LockRounded";

export interface BadgeIconProps {
  iconUrl: string | null;
  earned: boolean;
  size?: number;
}

export function BadgeIcon({ iconUrl, earned, size = 56 }: BadgeIconProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = iconUrl !== null && failedUrl !== iconUrl;
  const lockSize = Math.max(16, Math.round(size * 0.34));

  return (
    <span
      className="relative inline-flex shrink-0"
      style={{ width: size, height: size }}
    >
      <span
        className={`relative flex h-full w-full items-center justify-center overflow-hidden rounded-full ${
          showImage ? "" : earned ? "bg-[#fde7dc]" : "bg-[#e5e7eb]"
        } ${earned ? "" : "opacity-55 grayscale-[60%]"}`}
      >
        {showImage ? (
          <Image
            src={iconUrl}
            alt=""
            fill
            sizes={`${size}px`}
            unoptimized
            onError={() => setFailedUrl(iconUrl)}
            ref={(image) => {
              if (image?.complete && image.naturalWidth === 0) {
                setFailedUrl(iconUrl);
              }
            }}
            className="object-cover"
          />
        ) : (
          <EmojiEventsRounded
            aria-hidden="true"
            sx={{ fontSize: Math.round(size * 0.55) }}
            className={earned ? "text-[#e0622a]" : "text-[#9ca3af]"}
          />
        )}
      </span>
      {!earned && (
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -bottom-0.5 flex items-center justify-center rounded-full border-2 border-white bg-[#6b7280] text-white"
          style={{ width: lockSize, height: lockSize }}
        >
          <LockRounded sx={{ fontSize: Math.round(lockSize * 0.6) }} />
        </span>
      )}
    </span>
  );
}
