import type { BuildingPage } from "./location-data-source";
import type { LocationListState } from "./location-view-models";

export interface ListResult {
  key: string;
  page: BuildingPage | null;
}

export function toLocationListState({
  filterUnavailable,
  listResult,
  listKey,
}: {
  filterUnavailable: boolean;
  listResult: ListResult | undefined;
  listKey: string;
}): LocationListState {
  if (filterUnavailable) {
    return { status: "unavailable" };
  }
  if (!listResult || listResult.key !== listKey) {
    return { status: "loading" };
  }
  if (!listResult.page) {
    return { status: "error" };
  }
  return {
    status: "ready",
    buildings: listResult.page.buildings,
    totalCount: listResult.page.totalCount,
  };
}
