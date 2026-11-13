"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import Image from "next/image";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import AccessTime from "@mui/icons-material/AccessTime";
import ApartmentRounded from "@mui/icons-material/ApartmentRounded";
import Diversity3 from "@mui/icons-material/Diversity3";
import HelpOutlineRounded from "@mui/icons-material/HelpOutlineRounded";
import PeopleAlt from "@mui/icons-material/PeopleAlt";
import Person from "@mui/icons-material/Person";
import { formatUpdatedTime } from "./format-updated-time";
import type {
  BuildingCardModel,
  BuildingSelectHandler,
  CrowdLevel,
} from "./location-view-models";

interface CrowdTagStyle {
  label: string;
  icon: ComponentType<SvgIconProps>;
  className: string;
}

export const crowdLevelLabels: Record<CrowdLevel, string> = {
  low: "คนน้อย",
  medium: "ปานกลาง",
  high: "คนหนาแน่น",
};

export const unknownCrowdLabel = "ยังไม่มีข้อมูล";

export const crowdLevelIcons: Record<
  CrowdLevel | "unknown",
  ComponentType<SvgIconProps>
> = {
  low: Person,
  medium: PeopleAlt,
  high: Diversity3,
  unknown: HelpOutlineRounded,
};

const crowdTagStyles: Record<CrowdLevel | "unknown", CrowdTagStyle> = {
  low: {
    label: crowdLevelLabels.low,
    icon: crowdLevelIcons.low,
    className: "bg-[#39a94e]/22 text-[#006b14]",
  },
  medium: {
    label: crowdLevelLabels.medium,
    icon: crowdLevelIcons.medium,
    className: "bg-[#dfdf20]/22 text-[#6b6b00]",
  },
  high: {
    label: crowdLevelLabels.high,
    icon: crowdLevelIcons.high,
    className: "bg-[#ff0000]/22 text-[#b00000]",
  },
  unknown: {
    label: unknownCrowdLabel,
    icon: crowdLevelIcons.unknown,
    className: "bg-[#b9b9b9]/22 text-[#5f5f5f]",
  },
};

export function CrowdTag({ level }: { level: CrowdLevel | null }) {
  const style = crowdTagStyles[level ?? "unknown"];
  const Icon = style.icon;

  return (
    <span
      data-crowd-level={level ?? "unknown"}
      className={`flex h-7 min-w-[min(113px,30vw)] items-center justify-center gap-1 rounded-[7px] px-1 text-xs leading-none whitespace-nowrap ${style.className}`}
    >
      <Icon aria-hidden="true" sx={{ fontSize: 16 }} />
      {style.label}
    </span>
  );
}

export interface BuildingCardProps {
  building: BuildingCardModel;
  onSelect?: BuildingSelectHandler;
}

export const buildingSummaryGridClass =
  "grid w-full grid-cols-[clamp(64px,24%,112px)_minmax(0,1fr)_auto] grid-rows-[auto_auto] items-center gap-x-2.5 gap-y-1 px-1.5 py-2 text-left text-black";

export function BuildingCard({ building, onSelect }: BuildingCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(building.id)}
      className={`${buildingSummaryGridClass} cursor-pointer rounded-2xl border-0 bg-white transition-colors duration-150 hover:bg-[#fff7f2] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#ff5815]`}
    >
      <BuildingSummary building={building} />
    </button>
  );
}

export function BuildingSummary({
  building,
  floorControl,
}: {
  building: BuildingCardModel;
  floorControl?: ReactNode;
}) {
  const updatedTime = formatUpdatedTime(building.updatedAt);

  return (
    <>
      <BuildingImage
        imageUrl={building.imageUrl}
        sizes="112px"
        fallbackSize={36}
        className="row-span-2 aspect-[112/87]"
      />
      <span className="self-end truncate text-[clamp(1.125rem,5.2vw,1.5rem)] leading-tight font-bold">
        {building.code}
      </span>
      <span className="self-end justify-self-end">
        <CrowdTag level={building.crowdLevel} />
      </span>
      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 self-start">
        <span className="max-w-full truncate text-xs leading-normal">
          {building.name}
        </span>
        {floorControl}
      </span>
      <span className="flex items-center gap-1 self-start justify-self-end text-xs leading-normal whitespace-nowrap text-[#b9b9b9]">
        {updatedTime && (
          <>
            <AccessTime aria-hidden="true" sx={{ fontSize: 12 }} />
            {updatedTime}
          </>
        )}
      </span>
    </>
  );
}

export function BuildingImage({
  imageUrl,
  sizes,
  fallbackSize,
  preload,
  className,
}: {
  imageUrl: string | null;
  sizes: string;
  fallbackSize: number;
  preload?: boolean;
  className: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  return (
    <span
      className={`relative flex items-center justify-center overflow-hidden rounded-[10px] bg-[#e5e5e5] text-[#b9b9b9] ${className}`}
    >
      {imageUrl !== null && failedUrl !== imageUrl ? (
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes={sizes}
          unoptimized
          preload={preload}
          onError={() => setFailedUrl(imageUrl)}
          ref={(image) => {
            if (image?.complete && image.naturalWidth === 0) {
              setFailedUrl(imageUrl);
            }
          }}
          className="object-cover"
        />
      ) : (
        <ApartmentRounded aria-hidden="true" sx={{ fontSize: fallbackSize }} />
      )}
    </span>
  );
}
