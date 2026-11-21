"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  buildHomeQueryString,
  findConfirmedSearchBuilding,
  parseCrowdFilterParam,
  resolveMapSearch,
  type ApiCrowdBuilding,
  type CampusMapBuilding,
} from "@/features/campus-map/map-api-adapter";
import {
  campusMapApiSource,
  type CampusMapDataSource,
} from "@/features/campus-map/map-api-source";
import type { CrowdFilterValue } from "@/features/campus-map/map-state";
import type {
  BuildingCardModel,
  BuildingId,
  ExpandedBuildingModel,
} from "@/features/locations/components/location-view-models";
import { HomePage } from "./home-page";

const SEARCH_DELAY_MS = 300;

export interface HomeMapContainerProps {
  readonly dataSource?: CampusMapDataSource;
}

export function HomeMapContainer({
  dataSource = campusMapApiSource,
}: HomeMapContainerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [initialSearch] = useState(() => searchParams.get("q") ?? "");
  const [initialFilter] = useState<CrowdFilterValue>(() =>
    parseCrowdFilterParam(searchParams.get("level")),
  );
  const [initialBuildingId] = useState<string | null>(() =>
    searchParams.get("building"),
  );

  const [buildings, setBuildings] = useState<CampusMapBuilding[]>([]);
  const [crowdById, setCrowdById] = useState<Map<string, ApiCrowdBuilding>>(
    () => new Map(),
  );
  const [catalogStatus, setCatalogStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [catalogReloadNonce, setCatalogReloadNonce] = useState(0);
  const [crowdWarning, setCrowdWarning] = useState(false);

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedQuery, setDebouncedQuery] = useState(initialSearch.trim());
  const [crowdFilter, setCrowdFilter] =
    useState<CrowdFilterValue>(initialFilter);

  const [rawSearchMatches, setRawSearchMatches] = useState<
    BuildingCardModel[] | null
  >(null);
  const [searchFailed, setSearchFailed] = useState(false);
  const [searchReloadNonce, setSearchReloadNonce] = useState(0);
  const [dropdownDismissed, setDropdownDismissed] = useState(
    Boolean(initialBuildingId),
  );

  const [selectedBuildingId, setSelectedBuildingId] =
    useState<BuildingId | null>(null);
  const [expandedBuilding, setExpandedBuilding] =
    useState<ExpandedBuildingModel | null>(null);
  const [mapFocusNonce, setMapFocusNonce] = useState(0);

  const catalogControllerRef = useRef<AbortController | null>(null);
  const searchControllerRef = useRef<AbortController | null>(null);
  const floorsControllerRef = useRef<AbortController | null>(null);
  const restoredInitialSelectionRef = useRef(false);
  const pendingSearchConfirmRef = useRef<string | null>(null);

  const selectAndLoadBuilding = useCallback(
    (buildingId: BuildingId) => {
      floorsControllerRef.current?.abort();
      const controller = new AbortController();
      floorsControllerRef.current = controller;

      setSelectedBuildingId(buildingId);
      setDropdownDismissed(true);
      setMapFocusNonce((n) => n + 1);
      setExpandedBuilding({
        buildingId,
        floors: { status: "loading" },
      });

      Promise.resolve()
        .then(() =>
          dataSource.loadBuildingFloors(buildingId, controller.signal),
        )
        .then(
          ({ floors, defaultFloorId, buildingAvailability }) => {
            if (!controller.signal.aborted) {
              setExpandedBuilding({
                buildingId,
                floors: { status: "ready", floors },
                defaultFloorId,
                buildingAvailability,
              });
            }
          },
          () => {
            if (!controller.signal.aborted) {
              setExpandedBuilding({
                buildingId,
                floors: { status: "error" },
              });
            }
          },
        );
    },
    [dataSource],
  );

  const confirmSearchMatches = useCallback(
    (query: string, filteredResults: readonly BuildingCardModel[]) => {
      const confirmed = findConfirmedSearchBuilding(query, filteredResults);
      if (confirmed) {
        selectAndLoadBuilding(confirmed.id);
      } else if (filteredResults.length > 0) {
        setDropdownDismissed(true);
        setMapFocusNonce((n) => n + 1);
      }
    },
    [selectAndLoadBuilding],
  );

  const handleRetryCatalog = useCallback(() => {
    setCatalogStatus("loading");
    setCatalogReloadNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    catalogControllerRef.current?.abort();
    const controller = new AbortController();
    catalogControllerRef.current = controller;

    Promise.resolve()
      .then(() => dataSource.loadCatalog(controller.signal))
      .then(
        (result) => {
          if (controller.signal.aborted) {
            return;
          }
          setBuildings(result.buildings);
          setCrowdById(result.crowdById);
          setCrowdWarning(result.crowdWarning);
          setCatalogStatus("ready");

          if (
            !restoredInitialSelectionRef.current &&
            initialBuildingId &&
            result.buildings.some((item) => item.id === initialBuildingId)
          ) {
            restoredInitialSelectionRef.current = true;
            selectAndLoadBuilding(initialBuildingId);
          } else {
            restoredInitialSelectionRef.current = true;
          }
        },
        () => {
          if (!controller.signal.aborted) {
            setCatalogStatus("error");
          }
        },
      );

    return () => {
      controller.abort();
    };
  }, [
    dataSource,
    initialBuildingId,
    selectAndLoadBuilding,
    catalogReloadNonce,
  ]);

  useEffect(() => {
    return () => {
      searchControllerRef.current?.abort();
      floorsControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const query = buildHomeQueryString({
      search: debouncedQuery,
      crowdFilter,
      selectedBuildingId,
    });
    window.history.replaceState(
      null,
      "",
      query ? `?${query}` : window.location.pathname,
    );
  }, [debouncedQuery, crowdFilter, selectedBuildingId]);

  useEffect(() => {
    searchControllerRef.current?.abort();
    if (debouncedQuery === "") {
      return;
    }

    const controller = new AbortController();
    searchControllerRef.current = controller;

    Promise.resolve()
      .then(() =>
        dataSource.searchBuildings(
          debouncedQuery,
          crowdById,
          controller.signal,
        ),
      )
      .then(
        (matches) => {
          if (controller.signal.aborted) {
            return;
          }
          setSearchFailed(false);
          setRawSearchMatches(matches);

          const resolved = resolveMapSearch(
            debouncedQuery,
            matches,
            crowdFilter,
          );
          if (pendingSearchConfirmRef.current === debouncedQuery) {
            pendingSearchConfirmRef.current = null;
            confirmSearchMatches(debouncedQuery, resolved.filteredResults);
          }
        },
        () => {
          if (!controller.signal.aborted) {
            if (pendingSearchConfirmRef.current === debouncedQuery) {
              pendingSearchConfirmRef.current = null;
            }
            setSearchFailed(true);
            setRawSearchMatches([]);
          }
        },
      );

    return () => controller.abort();
  }, [
    dataSource,
    debouncedQuery,
    crowdById,
    crowdFilter,
    searchReloadNonce,
    confirmSearchMatches,
  ]);

  const searchResolution = useMemo(() => {
    if (debouncedQuery === "" || rawSearchMatches === null) {
      return {
        filteredResults: [] as BuildingCardModel[],
        highlightedBuildingIds: [] as string[],
        exactMatchBuilding: null as BuildingCardModel | null,
      };
    }
    return resolveMapSearch(debouncedQuery, rawSearchMatches, crowdFilter);
  }, [debouncedQuery, rawSearchMatches, crowdFilter]);

  const selectedBuilding = useMemo(
    () => buildings.find((item) => item.id === selectedBuildingId) ?? null,
    [buildings, selectedBuildingId],
  );

  function handleSearchChange(next: string) {
    pendingSearchConfirmRef.current = null;
    setSearchQuery(next);
    setSearchFailed(false);
    setDropdownDismissed(false);
    if (next.trim() === "") {
      searchControllerRef.current?.abort();
      setDebouncedQuery("");
      setRawSearchMatches(null);
    }
  }

  function handleSearchSubmit() {
    const trimmed = searchQuery.trim();
    if (trimmed === "") {
      return;
    }
    setDropdownDismissed(false);
    if (
      debouncedQuery === trimmed &&
      rawSearchMatches !== null &&
      !searchFailed
    ) {
      pendingSearchConfirmRef.current = null;
      confirmSearchMatches(trimmed, searchResolution.filteredResults);
      return;
    }
    pendingSearchConfirmRef.current = trimmed;
    if (debouncedQuery !== trimmed) {
      setSearchFailed(false);
      setDebouncedQuery(trimmed);
    } else if (searchFailed) {
      setSearchFailed(false);
      setSearchReloadNonce((n) => n + 1);
    }
  }

  function handleResetSearch() {
    pendingSearchConfirmRef.current = null;
    searchControllerRef.current?.abort();
    setSearchQuery("");
    setDebouncedQuery("");
    setRawSearchMatches(null);
    setSearchFailed(false);
    setDropdownDismissed(false);
  }

  function handleCrowdFilterChange(next: CrowdFilterValue) {
    setCrowdFilter(next);
    if (
      next !== "all" &&
      selectedBuilding &&
      selectedBuilding.crowdLevel !== next
    ) {
      floorsControllerRef.current?.abort();
      setSelectedBuildingId(null);
      setExpandedBuilding(null);
    }
  }

  function handleClearSelection() {
    floorsControllerRef.current?.abort();
    setSelectedBuildingId(null);
    setExpandedBuilding(null);
  }

  function handleViewDetail(buildingId: BuildingId) {
    const query = buildHomeQueryString({
      search: debouncedQuery,
      crowdFilter,
      selectedBuildingId: buildingId,
      includeFromHome: true,
    });
    router.push(
      `/locations/${encodeURIComponent(buildingId)}${query ? `?${query}` : ""}`,
    );
  }

  const showSearchResults =
    debouncedQuery !== "" &&
    !dropdownDismissed &&
    (searchFailed || rawSearchMatches !== null);

  const errorMessage =
    catalogStatus === "error"
      ? "ไม่สามารถโหลดข้อมูลแผนที่และอาคารได้ในขณะนี้"
      : null;

  const warningMessage =
    catalogStatus === "ready" && crowdWarning
      ? "ไม่สามารถโหลดข้อมูลความหนาแน่นล่าสุดได้ กำลังแสดงรายการอาคารโดยยังไม่ระบุระดับความหนาแน่น"
      : null;

  const emptyMessage =
    catalogStatus === "ready" && buildings.length === 0
      ? "ยังไม่มีข้อมูลอาคารที่เปิดใช้งาน"
      : null;

  return (
    <HomePage
      buildings={buildings}
      searchQuery={searchQuery}
      onSearchQueryChange={handleSearchChange}
      onSearchSubmit={handleSearchSubmit}
      searchResults={searchResolution.filteredResults}
      showSearchResults={showSearchResults}
      searchError={
        searchFailed ? "ไม่สามารถค้นหาอาคารได้ โปรดลองอีกครั้ง" : null
      }
      onRetrySearch={() => setSearchReloadNonce((n) => n + 1)}
      selectedBuilding={selectedBuilding}
      expandedBuilding={expandedBuilding}
      highlightedBuildingIds={searchResolution.highlightedBuildingIds}
      mapFocusNonce={mapFocusNonce}
      crowdFilter={crowdFilter}
      onCrowdFilterChange={handleCrowdFilterChange}
      onSelectBuilding={selectAndLoadBuilding}
      onClearSelection={handleClearSelection}
      onResetSearch={handleResetSearch}
      onViewDetail={handleViewDetail}
      isLoading={catalogStatus === "loading"}
      errorMessage={errorMessage}
      warningMessage={warningMessage}
      onRetry={handleRetryCatalog}
      emptyMessage={emptyMessage}
    />
  );
}
