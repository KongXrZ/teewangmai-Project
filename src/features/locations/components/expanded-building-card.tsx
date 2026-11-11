"use client";

import { useEffect, useId, useRef, useState } from "react";
import ArticleOutlined from "@mui/icons-material/ArticleOutlined";
import ChevronRight from "@mui/icons-material/ChevronRight";
import KeyboardArrowDown from "@mui/icons-material/KeyboardArrowDown";
import type {
  BuildingCardModel,
  BuildingSelectHandler,
  FloorId,
  FloorListState,
  FloorModel,
  FloorSelectHandler,
} from "./location-view-models";
import { buildingSummaryGridClass, BuildingSummary } from "./building-card";
import { FloorStats, hasFloorStats, toFloorStats } from "./floor-stats";

export interface ExpandedBuildingCardProps {
  building: BuildingCardModel;
  floors: FloorListState;
  onSelectFloor?: FloorSelectHandler;
  onViewDetail?: BuildingSelectHandler;
}

export function ExpandedBuildingCard({
  building,
  floors,
  onSelectFloor,
  onViewDetail,
}: ExpandedBuildingCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const floorList = floors.status === "ready" ? floors.floors : [];
  const [selectedFloorId, setSelectedFloorId] = useState<FloorId | undefined>(
    floorList[0]?.id,
  );
  const selectedFloor =
    floorList.find((floor) => floor.id === selectedFloorId) ?? floorList[0];

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
      className="rounded-2xl border-2 border-solid border-[#ff5815] bg-[#ff6200]/13 outline-none"
    >
      <div className={buildingSummaryGridClass}>
        <BuildingSummary
          building={building}
          floorControl={
            selectedFloor && (
              <FloorDropdown
                floors={floorList}
                selectedId={selectedFloor.id}
                onSelect={handleSelectFloor}
              />
            )
          }
        />
      </div>
      <div className="flex items-center gap-1 px-1.5 pb-2">
        <div className="flex min-w-0 flex-1 flex-col items-stretch">
          <FloorSummary floors={floors} floor={selectedFloor} />
        </div>
        <span
          aria-hidden="true"
          className="h-[38px] w-px shrink-0 bg-[#ff5815]"
        />
        <button
          type="button"
          onClick={() => onViewDetail?.(building.id)}
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
  onSelect,
}: {
  floors: FloorModel[];
  selectedId: FloorId;
  onSelect: (id: FloorId) => void;
}) {
  const selectId = useId();

  return (
    <span className="relative shrink-0">
      <label htmlFor={selectId} className="sr-only">
        เลือกชั้น
      </label>
      <select
        id={selectId}
        value={selectedId}
        onChange={(event) => onSelect(event.target.value)}
        className="h-11 cursor-pointer appearance-none rounded-[7px] border-0 bg-white pr-5 pl-2 text-xs text-black focus-visible:outline-2 focus-visible:outline-[#ff5815]"
      >
        {floors.map((floor) => (
          <option key={floor.id} value={floor.id}>
            ชั้น {floor.label}
          </option>
        ))}
      </select>
      <KeyboardArrowDown
        aria-hidden="true"
        sx={{ fontSize: 16 }}
        className="pointer-events-none absolute top-1/2 right-1 -translate-y-1/2"
      />
    </span>
  );
}

function FloorSummary({
  floors,
  floor,
}: {
  floors: FloorListState;
  floor: FloorModel | undefined;
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

  const stats = toFloorStats(floor);

  return (
    <>
      {hasFloorStats(stats) && (
        <FloorStats
          stats={stats}
          iconClassName="text-black"
          dividerClassName="border-[#ff5815]"
          labelClassName="text-[#b9b9b9]"
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
