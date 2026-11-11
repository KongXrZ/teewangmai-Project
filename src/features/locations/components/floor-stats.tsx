import type { ComponentType } from "react";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import AccessTime from "@mui/icons-material/AccessTime";
import DataUsage from "@mui/icons-material/DataUsage";
import Diversity3 from "@mui/icons-material/Diversity3";
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

interface StatItem {
  key: string;
  icon: ComponentType<SvgIconProps>;
  value: string;
  label: string;
}

function toStatItems(stats: FloorStatsModel): StatItem[] {
  const items: StatItem[] = [];
  if (stats.estimatedPeople !== null) {
    items.push({
      key: "people",
      icon: Diversity3,
      value: `~${peopleFormatter.format(stats.estimatedPeople)} คน`,
      label: "จำนวนคนโดยประมาณ",
    });
  }
  if (stats.densityPercent !== null) {
    items.push({
      key: "density",
      icon: DataUsage,
      value: `${Math.round(stats.densityPercent)}%`,
      label: "ความหนาแน่น",
    });
  }
  if (stats.openingHours !== null) {
    items.push({
      key: "hours",
      icon: AccessTime,
      value: `${stats.openingHours.open.slice(0, 5)} - ${stats.openingHours.close.slice(0, 5)}`,
      label: "ช่วงเวลาเปิด/ปิด",
    });
  }
  return items;
}

export function toFloorStats(floor: FloorModel): FloorStatsModel {
  const crowd = floor.crowd;
  return {
    estimatedPeople: crowd.status === "ready" ? crowd.estimatedPeople : null,
    densityPercent: crowd.status === "ready" ? crowd.densityPercent : null,
    openingHours: floor.openingHours,
  };
}

export function hasFloorStats(stats: FloorStatsModel) {
  return toStatItems(stats).length > 0;
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
    <dl className="m-0 flex min-w-0 flex-1 items-center">
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <div
            key={item.key}
            className={`flex min-h-[38px] min-w-0 flex-auto flex-col-reverse items-center justify-center px-1 text-center ${
              index > 0 ? `border-l border-solid ${dividerClassName}` : ""
            }`}
          >
            <dt
              className={`text-[11px] leading-normal wrap-anywhere ${labelClassName}`}
            >
              {item.label}
            </dt>
            <dd className="m-0 flex flex-wrap items-center justify-center gap-x-1 text-xs leading-normal font-bold wrap-anywhere text-black">
              <Icon
                aria-hidden="true"
                sx={{ fontSize: 16 }}
                className={iconClassName}
              />
              {item.value}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
