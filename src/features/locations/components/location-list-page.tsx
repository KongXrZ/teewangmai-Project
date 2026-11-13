"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import {
  CrowdLevelFilter,
  type CrowdLevelFilterValue,
} from "@/components/ui/crowd-level-filter";
import { SearchInput } from "@/components/ui/search-input";
import type {
  BuildingCardModel,
  BuildingSelectHandler,
  ExpandedBuildingModel,
  FloorSelectHandler,
  LocationListState,
} from "./location-view-models";
import { BuildingCard } from "./building-card";
import { ExpandedBuildingCard } from "./expanded-building-card";

export interface LocationListPageProps {
  state: LocationListState;
  onSearchChange?: (query: string) => void;
  onCrowdFilterChange?: (value: CrowdLevelFilterValue) => void;
  onSelectBuilding?: BuildingSelectHandler;
  expandedBuilding?: ExpandedBuildingModel;
  onSelectFloor?: FloorSelectHandler;
  onViewBuildingDetail?: BuildingSelectHandler;
}

export function LocationListPage({
  state,
  onSearchChange,
  onCrowdFilterChange,
  onSelectBuilding,
  ...expandedProps
}: LocationListPageProps) {
  const [query, setQuery] = useState("");
  const [crowdFilter, setCrowdFilter] = useState<CrowdLevelFilterValue>("all");
  const isFiltering = query.trim() !== "" || crowdFilter !== "all";

  function handleQueryChange(value: string) {
    setQuery(value);
    onSearchChange?.(value);
  }

  function handleCrowdFilterChange(value: CrowdLevelFilterValue) {
    setCrowdFilter(value);
    onCrowdFilterChange?.(value);
  }

  return (
    <>
      <main className="flex min-w-0 flex-1 flex-col px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-[calc(7.625rem+env(safe-area-inset-bottom,0px))] text-black min-[400px]:px-[22px]">
        <header className="flex gap-1.5 pl-1.5">
          <span
            aria-hidden="true"
            className="mt-1.5 h-[55px] w-2 shrink-0 rounded-full bg-[#ff5815]"
          />
          <div className="min-w-0">
            <h1 className="text-[clamp(2rem,8vw,2.375rem)] leading-[1.2] font-bold">
              รายการสถานที่
            </h1>
            <p className="text-base leading-snug font-medium text-[#878787]">
              ดูรายชื่ออาคารทั้งหมด พร้อมระดับความหนาแน่นล่าสุด
            </p>
          </div>
        </header>

        <div className="mt-3 px-1.5">
          <SearchInput
            id="location-list-search"
            label="ค้นหาสถานที่"
            placeholder="ค้นหาอาคารด้วยชื่อหรือรหัสอาคาร (เช่น N7)"
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
          />
        </div>

        <div className="mt-3.5 px-2">
          <CrowdLevelFilter
            selected={crowdFilter}
            onChange={handleCrowdFilterChange}
          />
        </div>

        {state.status === "ready" && (
          <div className="mt-1.5 flex items-center gap-2.5 px-3">
            <p
              role="status"
              className="shrink-0 text-base leading-snug font-medium text-[#878787]"
            >
              พบ {state.buildings.length} สถานที่
            </p>
            <span aria-hidden="true" className="h-px flex-1 bg-[#acacac]" />
          </div>
        )}

        <section
          aria-label="รายการอาคาร"
          className="mt-2 flex flex-1 flex-col rounded-2xl bg-white"
        >
          <ListContent
            state={state}
            isFiltering={isFiltering}
            onSelectBuilding={onSelectBuilding}
            {...expandedProps}
          />
        </section>
      </main>
      <BottomNavigation selected="places" />
    </>
  );
}

type BuildingListProps = Pick<
  LocationListPageProps,
  | "onSelectBuilding"
  | "expandedBuilding"
  | "onSelectFloor"
  | "onViewBuildingDetail"
> & { isFiltering: boolean };

function ListContent({
  state,
  ...listProps
}: BuildingListProps & { state: LocationListState }) {
  switch (state.status) {
    case "loading":
      return <ListMessage role="status" title="กำลังโหลดรายการสถานที่..." />;
    case "unavailable":
      return (
        <ListMessage
          title="ยังไม่มีข้อมูลสถานที่"
          description="ระบบรายการสถานที่ยังไม่พร้อมใช้งาน โปรดกลับมาอีกครั้ง"
        />
      );
    case "error":
      return (
        <ListMessage
          role="alert"
          title="โหลดรายการสถานที่ไม่สำเร็จ"
          description="เกิดข้อผิดพลาด โปรดลองใหม่อีกครั้ง"
        />
      );
    case "ready":
      return <BuildingList buildings={state.buildings} {...listProps} />;
  }
}

function BuildingList({
  buildings,
  isFiltering,
  onSelectBuilding,
  expandedBuilding,
  onSelectFloor,
  onViewBuildingDetail,
}: BuildingListProps & { buildings: BuildingCardModel[] }) {
  if (buildings.length === 0) {
    return isFiltering ? (
      <ListMessage
        image={
          <Image
            src="/images/location-empty-state.png"
            alt=""
            width={175}
            height={175}
          />
        }
        title="ไม่พบสถานที่ที่ค้นหา"
        description="ลองค้นหาด้วยชื่ออาคาร รหัสอาคาร หรือคำอื่นๆ อีกครั้ง"
      />
    ) : (
      <ListMessage
        title="ยังไม่มีสถานที่"
        description="ยังไม่มีอาคารในระบบ โปรดกลับมาอีกครั้ง"
      />
    );
  }

  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {buildings.map((building) => (
        <li key={building.id}>
          {building.id === expandedBuilding?.buildingId ? (
            <ExpandedBuildingCard
              building={building}
              floors={expandedBuilding.floors}
              onSelectFloor={onSelectFloor}
              onViewDetail={onViewBuildingDetail}
            />
          ) : (
            <BuildingCard building={building} onSelect={onSelectBuilding} />
          )}
        </li>
      ))}
    </ul>
  );
}

function ListMessage({
  image,
  title,
  description,
  role,
}: {
  image?: ReactNode;
  title: string;
  description?: string;
  role?: "status" | "alert";
}) {
  return (
    <div
      role={role}
      className={`flex flex-col items-center px-6 pb-8 text-center text-black ${
        image ? "pt-4.5" : "pt-24"
      }`}
    >
      {image}
      <p className="mt-2 text-2xl leading-snug font-bold">{title}</p>
      {description && (
        <p className="mt-1 text-[13px] leading-normal">{description}</p>
      )}
    </div>
  );
}
