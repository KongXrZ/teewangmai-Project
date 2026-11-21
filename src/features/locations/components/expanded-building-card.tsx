"use client";

import { useEffect, useId, useRef, useState } from "react";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ArticleOutlined from "@mui/icons-material/ArticleOutlined";
import CheckRounded from "@mui/icons-material/CheckRounded";
import ChevronRight from "@mui/icons-material/ChevronRight";
import KeyboardArrowDown from "@mui/icons-material/KeyboardArrowDown";
import { formatBuildingHoursLabel } from "../api/availability-display";
import type {
  BuildingAvailabilityModel,
  BuildingCardModel,
  BuildingSelectHandler,
  FloorId,
  FloorListState,
  FloorModel,
  FloorSelectHandler,
} from "./location-view-models";
import { buildingSummaryGridClass, BuildingSummary } from "./building-card";
import { FloorStats, toFloorStats } from "./floor-stats";

export type ExpandedBuildingCardVariant = "list" | "map";

export interface ExpandedBuildingCardProps {
  building: BuildingCardModel;
  floors: FloorListState;
  initialFloorId?: FloorId;
  buildingAvailability?: BuildingAvailabilityModel;
  variant?: ExpandedBuildingCardVariant;
  onSelectFloor?: FloorSelectHandler;
  onViewDetail?: BuildingSelectHandler;
}

const cardVariants: Record<
  ExpandedBuildingCardVariant,
  {
    container: string;
    dropdown: string;
    verticalDivider: string;
    statsDivider: string;
    statsLabel: string;
  }
> = {
  list: {
    container:
      "rounded-2xl border-2 border-solid border-[#ff5815] bg-[#ff6200]/13 outline-none",
    dropdown: "bg-white",
    verticalDivider: "bg-[#ff5815]",
    statsDivider: "border-[#ff5815]",
    statsLabel: "text-[#b9b9b9]",
  },
  map: {
    container:
      "rounded-2xl bg-white shadow-[0_8px_24px_rgba(8,24,40,0.18)] outline-none",
    dropdown: "bg-[#f4f5f7]",
    verticalDivider: "bg-[#e5e7eb]",
    statsDivider: "border-[#e5e7eb]",
    statsLabel: "text-[#878787]",
  },
};

export function ExpandedBuildingCard({
  building,
  floors,
  initialFloorId,
  buildingAvailability,
  variant = "list",
  onSelectFloor,
  onViewDetail,
}: ExpandedBuildingCardProps) {
  const styles = cardVariants[variant];
  const cardRef = useRef<HTMLDivElement>(null);
  const floorList = floors.status === "ready" ? floors.floors : [];
  const defaultFloorId =
    initialFloorId ??
    floorList.find((floor) => floor.label.trim() === "1")?.id ??
    floorList[0]?.id;
  const [selectedFloorId, setSelectedFloorId] = useState<FloorId | undefined>(
    defaultFloorId,
  );
  const selectedFloor =
    floorList.find((floor) => floor.id === selectedFloorId) ??
    floorList.find((floor) => floor.id === defaultFloorId) ??
    floorList[0];
  const buildingHoursLabel = formatBuildingHoursLabel(
    buildingAvailability ?? building.buildingAvailability,
  );

  useEffect(() => {
    cardRef.current?.focus();
  }, []);

  function handleSelectFloor(id: FloorId) {
    setSelectedFloorId(id);
    onSelectFloor?.(id);
  }

  return (
    <div
      ref={cardRef}
      tabIndex={-1}
      aria-current="true"
      aria-label={`${building.code} ${building.name}`}
      className={styles.container}
    >
      <div className={buildingSummaryGridClass}>
        <BuildingSummary
          building={building}
          floorControl={
            selectedFloor && (
              <FloorDropdown
                floors={floorList}
                selectedId={selectedFloor.id}
                bgClassName={styles.dropdown}
                onSelect={handleSelectFloor}
              />
            )
          }
        />
      </div>
      {buildingHoursLabel && (
        <p className="m-0 px-2 pb-1 text-[11px] leading-normal text-[#5f5f5f]">
          {buildingHoursLabel}
        </p>
      )}
      <div className="flex items-center gap-1 px-1.5 pb-2">
        <div className="flex min-w-0 flex-1 flex-col items-stretch">
          <FloorSummary
            floors={floors}
            floor={selectedFloor}
            dividerClassName={styles.statsDivider}
            labelClassName={styles.statsLabel}
          />
        </div>
        <span
          aria-hidden="true"
          className={`h-[38px] w-px shrink-0 ${styles.verticalDivider}`}
        />
        <button
          type="button"
          onClick={() => onViewDetail?.(building.id, selectedFloor?.id)}
          className="flex h-11 shrink-0 cursor-pointer items-center gap-0.5 rounded-lg border-0 bg-transparent px-1 text-xs font-bold whitespace-nowrap text-black focus-visible:outline-2 focus-visible:outline-[#ff5815]"
        >
          <ArticleOutlined aria-hidden="true" sx={{ fontSize: 16 }} />
          ดูรายละเอียด
          <ChevronRight aria-hidden="true" sx={{ fontSize: 16 }} />
        </button>
      </div>
    </div>
  );
}

function FloorDropdown({
  floors,
  selectedId,
  bgClassName,
  onSelect,
}: {
  floors: FloorModel[];
  selectedId: FloorId;
  bgClassName: string;
  onSelect: (id: FloorId) => void;
}) {
  const menuId = useId();
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const selected = floors.find((floor) => floor.id === selectedId);

  function handleSelect(id: FloorId) {
    setAnchor(null);
    onSelect(id);
  }

  return (
    <>
      <button
        type="button"
        aria-label={`เลือกชั้น ตอนนี้ชั้น ${selected?.label ?? ""}`}
        aria-haspopup="listbox"
        aria-expanded={anchor !== null}
        aria-controls={anchor ? menuId : undefined}
        onClick={(event) => setAnchor(event.currentTarget)}
        className={`flex h-11 shrink-0 cursor-pointer items-center gap-0.5 rounded-[7px] border-0 pr-1 pl-2 text-xs whitespace-nowrap text-black focus-visible:outline-2 focus-visible:outline-[#ff5815] ${bgClassName}`}
      >
        ชั้น {selected?.label}
        <KeyboardArrowDown aria-hidden="true" sx={{ fontSize: 16 }} />
      </button>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={anchor !== null}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              mt: 0.5,
              minWidth: anchor?.offsetWidth,
              maxHeight: 220,
              borderRadius: "7px",
              boxShadow: "0 4px 4px rgba(0,0,0,0.25)",
            },
          },
          list: { role: "listbox", "aria-label": "เลือกชั้น", sx: { py: 0 } },
        }}
      >
        {floors.map((floor) => (
          <MenuItem
            key={floor.id}
            role="option"
            selected={floor.id === selectedId}
            aria-selected={floor.id === selectedId}
            onClick={() => handleSelect(floor.id)}
            sx={{
              minHeight: 44,
              gap: 0.5,
              px: 1,
              fontSize: 12,
              "&.Mui-selected, &.Mui-selected:hover, &.Mui-selected.Mui-focusVisible":
                { bgcolor: "rgba(255,88,21,0.2)" },
            }}
          >
            ชั้น {floor.label}
            {floor.id === selectedId && (
              <CheckRounded
                aria-hidden="true"
                sx={{ fontSize: 16, color: "#ff5815", ml: "auto" }}
              />
            )}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

function FloorSummary({
  floors,
  floor,
  dividerClassName,
  labelClassName,
}: {
  floors: FloorListState;
  floor: FloorModel | undefined;
  dividerClassName: string;
  labelClassName: string;
}) {
  if (floors.status !== "ready" || !floor) {
    const message = {
      loading: "กำลังโหลดข้อมูลชั้น...",
      error: "โหลดข้อมูลชั้นไม่สำเร็จ",
      ready: "ยังไม่มีข้อมูลชั้นของอาคารนี้",
    }[floors.status];
    return (
      <StatusText role={floors.status === "error" ? "alert" : undefined}>
        {message}
      </StatusText>
    );
  }

  return (
    <>
      {floor.crowd.status === "ready" && (
        <FloorStats
          stats={toFloorStats(floor)}
          iconClassName="text-black"
          dividerClassName={dividerClassName}
          labelClassName={labelClassName}
        />
      )}
      {floor.crowd.status === "loading" && (
        <StatusText>กำลังโหลดข้อมูลชั้นนี้...</StatusText>
      )}
      {floor.crowd.status === "error" && (
        <StatusText role="alert">โหลดข้อมูลชั้นนี้ไม่สำเร็จ</StatusText>
      )}
    </>
  );
}

function StatusText({ role, children }: { role?: "alert"; children: string }) {
  return (
    <p
      role={role}
      className="m-0 text-center text-[11px] leading-normal text-[#878787]"
    >
      {children}
    </p>
  );
}
