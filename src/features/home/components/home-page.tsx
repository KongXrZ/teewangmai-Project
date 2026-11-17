"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ChangeEvent } from "react";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { SearchInput } from "@/components/ui/search-input";
import { CampusMap } from "@/features/campus-map/components/campus-map";
import type {
  CampusBuildingMarker,
  CrowdFilterValue,
} from "@/features/campus-map/map-state";
import { BuildingCard } from "@/features/locations/components/building-card";
import type {
  BuildingCardModel,
  BuildingSelectHandler,
  ExpandedBuildingModel,
  FloorSelectHandler,
} from "@/features/locations/components/location-view-models";

export interface HomePageProps {
  readonly buildings?: readonly CampusBuildingMarker[];
  readonly searchQuery?: string;
  readonly defaultSearchQuery?: string;
  readonly onSearchQueryChange?: (query: string) => void;
  readonly searchResults?: readonly BuildingCardModel[];
  readonly showSearchResults?: boolean;
  readonly selectedBuilding?: BuildingCardModel | null;
  readonly expandedBuilding?: ExpandedBuildingModel | null;
  readonly highlightedBuildingIds?: readonly string[];
  readonly crowdFilter?: CrowdFilterValue;
  readonly defaultCrowdFilter?: CrowdFilterValue;
  readonly onCrowdFilterChange?: (value: CrowdFilterValue) => void;
  readonly onSelectBuilding?: BuildingSelectHandler;
  readonly onClearSelection?: () => void;
  readonly onResetSearch?: () => void;
  readonly onSelectFloor?: FloorSelectHandler;
  readonly onViewDetail?: BuildingSelectHandler;
  readonly isFullscreen?: boolean;
  readonly defaultFullscreen?: boolean;
  readonly onFullscreenChange?: (fullscreen: boolean) => void;
  readonly isLoading?: boolean;
  readonly errorMessage?: string | null;
  readonly warningMessage?: string | null;
  readonly emptyMessage?: string | null;
  readonly searchError?: string | null;
  readonly onRetry?: () => void;
  readonly onRetrySearch?: () => void;
}

export function HomePage({
  buildings = [],
  searchQuery: controlledQuery,
  defaultSearchQuery = "",
  onSearchQueryChange,
  searchResults,
  showSearchResults,
  selectedBuilding = null,
  expandedBuilding = null,
  highlightedBuildingIds = [],
  crowdFilter,
  defaultCrowdFilter = "all",
  onCrowdFilterChange,
  onSelectBuilding,
  onClearSelection,
  onResetSearch,
  onSelectFloor,
  onViewDetail,
  isFullscreen: controlledFullscreen,
  defaultFullscreen = false,
  onFullscreenChange,
  isLoading = false,
  errorMessage = null,
  warningMessage = null,
  emptyMessage = null,
  searchError = null,
  onRetry,
  onRetrySearch,
}: HomePageProps) {
  const [internalQuery, setInternalQuery] = useState(defaultSearchQuery);
  const [internalFullscreen, setInternalFullscreen] =
    useState(defaultFullscreen);

  const activeQuery = controlledQuery ?? internalQuery;
  const isFullscreen = controlledFullscreen ?? internalFullscreen;

  const isDropdownVisible =
    showSearchResults ??
    (searchResults !== undefined && activeQuery.trim().length > 0);

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    if (controlledQuery === undefined) {
      setInternalQuery(next);
    }
    onSearchQueryChange?.(next);
  }

  function handleResetSearch() {
    if (controlledQuery === undefined) {
      setInternalQuery("");
    }
    onSearchQueryChange?.("");
    onResetSearch?.();
  }

  function handleFullscreenChange(next: boolean) {
    if (controlledFullscreen === undefined) {
      setInternalFullscreen(next);
    }
    onFullscreenChange?.(next);
  }

  const searchFieldWithDropdown = (
    <div className="relative z-30 min-w-0">
      <SearchInput
        id={isFullscreen ? "location-search-fullscreen" : "location-search"}
        label="ค้นหาสถานที่"
        placeholder="ค้นหาสถานที่..."
        value={activeQuery}
        onChange={handleSearchChange}
      />

      {isDropdownVisible ? (
        <div
          role="region"
          aria-label="ผลการค้นหาสถานที่"
          className="absolute inset-x-0 top-full mt-2 max-h-[min(50dvh,360px)] overflow-y-auto rounded-[24px] border border-[#e5e7eb] bg-white p-2.5 shadow-[0_12px_32px_rgba(8,24,40,0.18)]"
        >
          {searchError ? (
            <div className="flex flex-col items-center px-4 py-5 text-center">
              <p role="alert" className="text-sm font-semibold text-[#b91c1c]">
                {searchError}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                {onRetrySearch ? (
                  <button
                    type="button"
                    onClick={onRetrySearch}
                    className="rounded-full border border-[#fca5a5] bg-white px-4 py-2 text-xs font-medium text-[#b91c1c] transition-colors hover:bg-[#fef2f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff5815]"
                  >
                    ลองค้นหาใหม่
                  </button>
                ) : null}
                <Link
                  href="/locations"
                  className="rounded-full bg-[#ff5815] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#e54e10] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff5815]"
                >
                  ดูสถานที่ทั้งหมด
                </Link>
              </div>
            </div>
          ) : searchResults && searchResults.length > 0 ? (
            <ul className="flex flex-col gap-2.5">
              {searchResults.map((building) => (
                <li key={building.id}>
                  <BuildingCard
                    building={building}
                    onSelect={onSelectBuilding}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center px-4 py-5 text-center">
              <Image
                src="/images/location-empty-state.png"
                alt="ไม่พบสถานที่ที่ค้นหา"
                width={160}
                height={96}
                unoptimized
                className="h-24 w-auto object-contain"
              />
              <p className="mt-3 text-base font-bold text-[#081828]">
                ไม่พบสถานที่ที่ค้นหา
              </p>
              <p className="mt-1 text-xs text-[#64748b]">
                ลองเปลี่ยนคำค้นหา หรือดูรายชื่ออาคารทั้งหมด
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleResetSearch}
                  className="rounded-full border border-[#cbd5e1] bg-white px-4 py-2 text-xs font-medium text-[#081828] transition-colors hover:bg-[#f8fafc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff5815]"
                >
                  ล้างคำค้นหา
                </button>
                <Link
                  href="/locations"
                  className="rounded-full bg-[#ff5815] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#e54e10] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff5815]"
                >
                  ดูสถานที่ทั้งหมด
                </Link>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      <div className="flex min-h-0 min-w-0 flex-1 overflow-x-clip">
        <main
          className={
            isFullscreen
              ? "flex min-h-0 min-w-0 flex-1 flex-col bg-white pb-[calc(5rem+env(safe-area-inset-bottom,0px))] text-[#081828]"
              : "flex min-h-0 min-w-0 flex-1 flex-col gap-2.5 px-4 pt-[max(2rem,env(safe-area-inset-top,0px))] pb-[calc(7.625rem+env(safe-area-inset-bottom,0px))] text-[#081828] min-[390px]:px-6 sm:px-9"
          }
        >
          {!isFullscreen ? (
            <header className="shrink-0 text-center">
              <Link
                href="/"
                className="block text-[2.25rem] leading-[1.2] font-bold tracking-[-0.035em] min-[390px]:text-[2.5rem]"
              >
                TeeWangMai?
              </Link>
              <p className="mt-0.5 text-sm leading-snug min-[390px]:text-base">
                ตรวจสอบความหนาแน่นของคนในอาคารที่คุณจะไป
              </p>
            </header>
          ) : null}

          {!isFullscreen ? searchFieldWithDropdown : null}

          <CampusMap
            buildings={buildings}
            selectedBuilding={selectedBuilding}
            expandedBuilding={expandedBuilding}
            highlightedBuildingIds={highlightedBuildingIds}
            crowdFilter={crowdFilter}
            defaultCrowdFilter={defaultCrowdFilter}
            onCrowdFilterChange={onCrowdFilterChange}
            onSelectBuilding={onSelectBuilding}
            onClearSelection={onClearSelection}
            onSelectFloor={onSelectFloor}
            onViewDetail={onViewDetail}
            isFullscreen={isFullscreen}
            fullscreenLayout="contained"
            onFullscreenChange={handleFullscreenChange}
            topSlot={isFullscreen ? searchFieldWithDropdown : undefined}
            isLoading={isLoading}
            errorMessage={errorMessage}
            warningMessage={warningMessage}
            emptyMessage={emptyMessage}
            onRetry={onRetry}
          />
        </main>
      </div>
      <BottomNavigation selected="home" />
    </>
  );
}
