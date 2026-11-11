"use client";

import { useState, type ComponentType } from "react";
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

const crowdTagStyles: Record<CrowdLevel | "unknown", CrowdTagStyle> = {
  low: {
    label: crowdLevelLabels.low,
    icon: Person,
    className: "bg-[#39a94e]/22 text-[#006b14]",
  },
  medium: {
    label: crowdLevelLabels.medium,
    icon: PeopleAlt,
    className: "bg-[#dfdf20]/22 text-[#6b6b00]",
  },
  high: {
    label: crowdLevelLabels.high,
    icon: Diversity3,
    className: "bg-[#ff0000]/22 text-[#b00000]",
  },
  unknown: {
    label: unknownCrowdLabel,
    icon: HelpOutlineRounded,
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

export function BuildingCard({ building, onSelect }: BuildingCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = building.imageUrl !== null && !imageFailed;
  const updatedTime = formatUpdatedTime(building.updatedAt);

  return (
    <button
      type="button"
      onClick={() => onSelect?.(building.id)}
      className="grid w-full cursor-pointer grid-cols-[clamp(64px,24%,112px)_minmax(0,1fr)_auto] grid-rows-[auto_auto] items-center gap-x-2.5 gap-y-1 rounded-2xl border-0 bg-white px-1.5 py-2 text-left text-black transition-colors duration-150 hover:bg-[#fff7f2] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#ff5815]"
    >
      <span className="relative row-span-2 flex aspect-[112/87] items-center justify-center overflow-hidden rounded-[10px] bg-[#e5e5e5] text-[#b9b9b9]">
        {showImage ? (
          <Image
            src={building.imageUrl!}
            alt=""
            fill
            sizes="112px"
            unoptimized
            onError={() => setImageFailed(true)}
            ref={(image) => {
              if (image?.complete && image.naturalWidth === 0) {
                setImageFailed(true);
              }
            }}
            className="object-cover"
          />
        ) : (
          <ApartmentRounded aria-hidden="true" sx={{ fontSize: 36 }} />
        )}
      </span>
      <span className="self-end truncate text-[clamp(1.125rem,5.2vw,1.5rem)] leading-tight font-bold">
        {building.code}
      </span>
      <span className="self-end justify-self-end">
        <CrowdTag level={building.crowdLevel} />
      </span>
      <span className="self-start truncate text-xs leading-normal">
        {building.name}
      </span>
      <span className="flex items-center gap-1 self-start justify-self-end text-xs leading-normal whitespace-nowrap text-[#b9b9b9]">
        {updatedTime && (
          <>
            <AccessTime aria-hidden="true" sx={{ fontSize: 12 }} />
            {updatedTime}
          </>
        )}
      </span>
    </button>
  );
}
