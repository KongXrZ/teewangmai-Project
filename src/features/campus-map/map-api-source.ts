import type {
  BuildingCardModel,
  BuildingId,
  FloorModel,
} from "@/features/locations/components/location-view-models";
import {
  mergeBuildingFloors,
  mergeBuildingWithCrowd,
  toCrowdBuildingMap,
  type ApiCrowdBuilding,
  type ApiCrowdFloor,
  type ApiLocationBuilding,
  type ApiLocationFloor,
  type CampusMapBuilding,
} from "./map-api-adapter";

const PAGE_SIZE = 50;
const MAX_SEARCH_LENGTH = 200;

export interface CampusMapCatalogResult {
  readonly buildings: CampusMapBuilding[];
  readonly crowdById: Map<string, ApiCrowdBuilding>;
  readonly crowdWarning: boolean;
}

export interface CampusMapFloorsResult {
  readonly floors: FloorModel[];
  readonly defaultFloorId: string | null;
}

export interface CampusMapDataSource {
  loadCatalog(signal: AbortSignal): Promise<CampusMapCatalogResult>;
  searchBuildings(
    query: string,
    crowdById: ReadonlyMap<string, ApiCrowdBuilding>,
    signal: AbortSignal,
  ): Promise<BuildingCardModel[]>;
  loadBuildingFloors(
    buildingId: BuildingId,
    signal: AbortSignal,
  ): Promise<CampusMapFloorsResult>;
}

interface ApiPagination {
  page: number;
  total_pages: number;
}

class HttpStatusError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function fetchJson<T>(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal, cache: "no-store" });
  let body: { success?: boolean; data?: T; pagination?: ApiPagination } | null =
    null;
  try {
    body = await response.json();
  } catch {
    throw new HttpStatusError(`Invalid response from ${url}`, response.status);
  }
  if (!response.ok || body?.success !== true) {
    throw new HttpStatusError(
      `Request failed (${response.status})`,
      response.status,
    );
  }
  return body as { data: T; pagination?: ApiPagination };
}

async function fetchAllActiveBuildings(
  signal: AbortSignal,
): Promise<ApiLocationBuilding[]> {
  const first = await fetchJson<ApiLocationBuilding[]>(
    `/api/locations?page=1&limit=${PAGE_SIZE}`,
    signal,
  );
  if (!Array.isArray(first.data) || !first.pagination) {
    throw new Error("Location API returned an unexpected list");
  }
  const buildings = [...first.data];
  const totalPages = first.pagination.total_pages;
  for (let page = 2; page <= totalPages; page += 1) {
    const next = await fetchJson<ApiLocationBuilding[]>(
      `/api/locations?page=${page}&limit=${PAGE_SIZE}`,
      signal,
    );
    if (!Array.isArray(next.data)) {
      throw new Error("Location API returned an unexpected page");
    }
    buildings.push(...next.data);
  }
  return buildings;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export const campusMapApiSource: CampusMapDataSource = {
  async loadCatalog(signal) {
    const [buildingsPromise, crowdOutcome] = await Promise.all([
      fetchAllActiveBuildings(signal),
      fetchJson<ApiCrowdBuilding[]>("/api/crowd/locations", signal).then(
        (res) => ({ ok: true as const, data: res.data }),
        (error: unknown) => {
          if (isAbortError(error)) {
            throw error;
          }
          return { ok: false as const };
        },
      ),
    ]);

    const crowdWarning = !crowdOutcome.ok || !Array.isArray(crowdOutcome.data);
    const crowdById =
      !crowdWarning && crowdOutcome.ok
        ? toCrowdBuildingMap(crowdOutcome.data)
        : new Map<string, ApiCrowdBuilding>();

    const buildings = buildingsPromise.map((building) =>
      mergeBuildingWithCrowd(building, crowdById.get(String(building.id))),
    );

    return { buildings, crowdById, crowdWarning };
  },

  async searchBuildings(query, crowdById, signal) {
    const trimmed = query.trim().slice(0, MAX_SEARCH_LENGTH);
    if (trimmed === "") {
      return [];
    }
    const params = new URLSearchParams({
      q: trimmed,
      page: "1",
      limit: String(PAGE_SIZE),
    });
    const res = await fetchJson<ApiLocationBuilding[]>(
      `/api/locations?${params}`,
      signal,
    );
    if (!Array.isArray(res.data)) {
      throw new Error("Location search API returned an unexpected list");
    }
    return res.data.map((building) =>
      mergeBuildingWithCrowd(building, crowdById.get(String(building.id))),
    );
  },

  async loadBuildingFloors(buildingId, signal) {
    const encodedId = encodeURIComponent(buildingId);
    const [detailOutcome, crowdOutcome] = await Promise.all([
      fetchJson<{ floors: ApiLocationFloor[] }>(
        `/api/locations/${encodedId}`,
        signal,
      ),
      fetchJson<{
        default_floor_id?: number | null;
        floors?: ApiCrowdFloor[];
      }>(`/api/crowd/locations/${encodedId}`, signal).then(
        (res) => ({ ok: true as const, data: res.data }),
        (error: unknown) => {
          if (isAbortError(error)) {
            throw error;
          }
          if (error instanceof HttpStatusError && error.status === 404) {
            return {
              ok: true as const,
              data: { default_floor_id: null, floors: [] as ApiCrowdFloor[] },
            };
          }
          return { ok: false as const };
        },
      ),
    ]);

    if (!Array.isArray(detailOutcome.data?.floors)) {
      throw new Error("Location detail API returned unexpected floors");
    }

    const crowdFailed = !crowdOutcome.ok;
    const crowdFloors = crowdOutcome.ok ? crowdOutcome.data?.floors : undefined;
    const defaultFloorId =
      crowdOutcome.ok && crowdOutcome.data?.default_floor_id != null
        ? String(crowdOutcome.data.default_floor_id)
        : null;

    return {
      floors: mergeBuildingFloors(
        detailOutcome.data.floors,
        crowdFloors,
        crowdFailed,
      ),
      defaultFloorId,
    };
  },
};
