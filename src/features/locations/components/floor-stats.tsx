import type { ComponentType } from "react";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import AccessTime from "@mui/icons-material/AccessTime";
import DataUsage from "@mui/icons-material/DataUsage";
import Diversity3 from "@mui/icons-material/Diversity3";
import { formatFloorHoursValue } from "../api/availability-display";
import type {
  CrowdLevel,
  FloorModel,
  FloorStatsModel,
} from "./location-view-models";

export interface CrowdTheme {
  panel: string;
  circle: string;
  accent: string;
  divider: string;
  border: string;
}

export const crowdThemes: Record<CrowdLevel | "unknown", CrowdTheme> = {
  low: {
    panel: "bg-[#eefbf4]",
    circle: "bg-[#d1fcde]",
    accent: "text-[#006b14]",
    divider: "bg-[#94dea2]",
    border: "border-[#94dea2]",
  },
  medium: {
    panel: "bg-[#fbfbee]",
    circle: "bg-[#ffffa6]",
    accent: "text-[#6b6b00]",
    divider: "bg-[#e4e42d]",
    border: "border-[#e4e42d]",
  },
  high: {
    panel: "bg-[#fbeeee]",
    circle: "bg-[#ffa6a6]",
    accent: "text-[#b00000]",
    divider: "bg-[#e42d2d]",
    border: "border-[#e42d2d]",
  },
  unknown: {
    panel: "bg-[#f4f5f7]",
    circle: "bg-[#e5e5e5]",
    accent: "text-[#5f5f5f]",
    divider: "bg-[#d9d9d9]",
    border: "border-[#d9d9d9]",
  },
};

const peopleFormatter = new Intl.NumberFormat("th-TH");
const percentFormatter = new Intl.NumberFormat("th-TH", {
  maximumFractionDigits: 1,
});

interface StatItem {
  key: string;
  icon: ComponentType<SvgIconProps>;
  value: string;
  label: string;
}

function toStatItems(stats: FloorStatsModel): StatItem[] {
  return [
    {
      key: "people",
      icon: Diversity3,
      value:
        stats.estimatedPeople === null
          ? "ไม่มีข้อมูล"
          : `~${peopleFormatter.format(stats.estimatedPeople)} คน`,
      label: "จำนวนคนโดยประมาณ",
    },
    {
      key: "density",
      icon: DataUsage,
      value:
        stats.densityPercent === null
          ? "ไม่มีข้อมูล"
          : `${percentFormatter.format(stats.densityPercent)}%`,
      label: "ความหนาแน่น",
    },
    {
      key: "hours",
      icon: AccessTime,
      value: formatFloorHoursValue(stats.openingHours),
      label: "เวลาเปิดชั้นนี้",
    },
  ];
}

export function toFloorStats(floor: FloorModel): FloorStatsModel {
  const crowd = floor.crowd;
  return {
    estimatedPeople: crowd.status === "ready" ? crowd.estimatedPeople : null,
    densityPercent: crowd.status === "ready" ? crowd.densityPercent : null,
    openingHours: floor.openingHours,
  };
}

export interface FloorStatsProps {
  stats: FloorStatsModel;
  iconClassName: string;
  dividerClassName: string;
  labelClassName: string;
}

export function FloorStats({
  stats,
  iconClassName,
  dividerClassName,
  labelClassName,
}: FloorStatsProps) {
  const items = toStatItems(stats);

  return (
    <dl className="m-0 flex min-w-0 flex-1 items-stretch">
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <div
            key={item.key}
            className={`flex min-h-[38px] min-w-0 flex-auto flex-col-reverse items-center justify-between px-1 text-center ${
              index > 0 ? `border-l border-solid ${dividerClassName}` : ""
            }`}
          >
            <dt
              className={`max-w-full text-[11px] leading-snug text-balance break-words ${labelClassName}`}
            >
              {item.label}
            </dt>
            <dd className="m-0 flex max-w-full min-w-0 items-center justify-center gap-1 text-xs leading-snug font-bold text-black">
              <Icon
                aria-hidden="true"
                sx={{ fontSize: 16 }}
                className={`shrink-0 ${iconClassName}`}
              />
              <span className="min-w-0 text-balance break-words">
                {item.value}
              </span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
