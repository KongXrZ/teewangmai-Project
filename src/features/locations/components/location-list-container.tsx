"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CrowdLevelFilterValue } from "@/components/ui/crowd-level-filter";
import type {
  BuildingCardModel,
  LocationListState,
} from "./location-view-models";
import type { BuildingPage, LocationDataSource } from "./location-data-source";
import { LocationListPage } from "./location-list-page";

const searchDelayMs = 300;

const crowdFilterValues: CrowdLevelFilterValue[] = ["low", "medium", "high"];

interface ListResult {
  key: string;
  page: BuildingPage | null;
}

interface MoreRequest {
  page: BuildingPage;
  failed: boolean;
}

function appendBuildings(
  current: BuildingCardModel[],
  next: BuildingCardModel[],
) {
  const ids = new Set(current.map((building) => building.id));
  return [...current, ...next.filter((building) => !ids.has(building.id))];
}

export interface LocationListContainerProps {
  dataSource?: LocationDataSource;
}

export function LocationListContainer({
  dataSource,
}: LocationListContainerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [initialSearch] = useState(() => searchParams.get("q") ?? "");
  const [initialCrowdFilter] = useState<CrowdLevelFilterValue>(
    () =>
      crowdFilterValues.find((value) => value === searchParams.get("level")) ??
      "all",
  );
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch.trim());
  const [crowdFilter, setCrowdFilter] = useState(initialCrowdFilter);
  const [listResult, setListResult] = useState<ListResult>();
  const [moreRequest, setMoreRequest] = useState<MoreRequest>();
  const moreControllerRef = useRef<AbortController | null>(null);

  const listKey = JSON.stringify([crowdFilter, debouncedSearch]);
  const crowdLevel = crowdFilter === "all" ? null : crowdFilter;
  const currentPage = listResult?.key === listKey ? listResult.page : null;
  const nextCursor = currentPage?.nextCursor ?? null;
  const moreForPage =
    currentPage && moreRequest?.page === currentPage ? moreRequest : undefined;
  const loadingMore = moreForPage !== undefined && !moreForPage.failed;

  function handleCrowdFilterChange(value: CrowdLevelFilterValue) {
    setCrowdFilter(value);
    setDebouncedSearch(search.trim());
  }

  function handleLoadMore() {
    if (!dataSource || !currentPage || nextCursor === null || moreForPage) {
      return;
    }
    const fromPage = currentPage;
    const cursor = nextCursor;
    const controller = new AbortController();
    moreControllerRef.current?.abort();
    moreControllerRef.current = controller;
    setMoreRequest({ page: fromPage, failed: false });
    Promise.resolve()
      .then(() =>
        dataSource.listBuildings(
          { search: debouncedSearch, crowdLevel, cursor },
          controller.signal,
        ),
      )
      .then(
        (page) => {
          if (controller.signal.aborted) {
            return;
          }
          setListResult((previous) =>
            previous?.page === fromPage
              ? {
                  key: previous.key,
                  page: {
                    buildings: appendBuildings(
                      fromPage.buildings,
                      page.buildings,
                    ),
                    nextCursor:
                      page.nextCursor === cursor ? null : page.nextCursor,
                    totalCount: page.totalCount ?? fromPage.totalCount,
                  },
                }
              : previous,
          );
        },
        () => {
          if (!controller.signal.aborted) {
            setMoreRequest({ page: fromPage, failed: true });
          }
        },
      );
  }

  useEffect(() => () => moreControllerRef.current?.abort(), []);

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearch(search.trim()),
      searchDelayMs,
    );
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch !== "") {
      params.set("q", debouncedSearch);
    }
    if (crowdFilter !== "all") {
      params.set("level", crowdFilter);
    }
    window.history.replaceState(
      null,
      "",
      params.size === 0 ? window.location.pathname : `?${params}`,
    );
  }, [debouncedSearch, crowdFilter]);

  useEffect(() => {
    if (!dataSource) {
      return;
    }
    moreControllerRef.current?.abort();
    const controller = new AbortController();
    const key = listKey;
    Promise.resolve()
      .then(() =>
        dataSource.listBuildings(
          { search: debouncedSearch, crowdLevel, cursor: null },
          controller.signal,
        ),
      )
      .then(
        (page) => {
          if (!controller.signal.aborted) {
            setListResult({ key, page });
          }
        },
        () => {
          if (!controller.signal.aborted) {
            setListResult({ key, page: null });
          }
        },
      );
    return () => controller.abort();
  }, [dataSource, listKey, debouncedSearch, crowdLevel]);

  function toListState(): LocationListState {
    if (!dataSource) {
      return { status: "unavailable" };
    }
    if (!listResult) {
      return { status: "loading" };
    }
    const { page } = listResult;
    if (page && (listResult.key === listKey || page.buildings.length > 0)) {
      return {
        status: "ready",
        buildings: page.buildings,
        totalCount: page.totalCount,
      };
    }
    if (!page && listResult.key === listKey) {
      return { status: "error" };
    }
    return { status: "loading" };
  }

  return (
    <LocationListPage
      state={toListState()}
      initialQuery={initialSearch}
      initialCrowdFilter={initialCrowdFilter}
      onSearchChange={setSearch}
      onCrowdFilterChange={handleCrowdFilterChange}
      onSelectBuilding={(id) =>
        router.push(`/locations/${encodeURIComponent(id)}`)
      }
      onLoadMore={
        nextCursor !== null && !moreForPage?.failed ? handleLoadMore : undefined
      }
      loadingMore={loadingMore}
    />
  );
}
