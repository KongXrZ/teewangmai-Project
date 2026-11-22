import {
  mergeBuildingFloors,
  mergeBuildingWithCrowd,
  toCrowdBuildingMap,
  type ApiCrowdBuilding,
  type ApiCrowdFloor,
  type ApiLocationBuilding,
  type ApiLocationFloor,
} from "../../campus-map/map-api-adapter.ts";
import {
  toAvailabilityModel,
  type ApiAvailabilityDto,
} from "../api/availability-display.ts";
import type {
  BuildingFloorsResult,
  LocationDataSource,
} from "./location-data-source";
import type { BuildingId } from "./location-view-models";

const pageSize = 20;
const filterFetchPageSize = 50;
const maxSearchLength = 200;

interface ApiPagination {
  page: number;
  total: number;
  total_pages: number;
}

class HttpStatusError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

async function getData<T>(
  fetchImpl: typeof fetch,
  url: string,
  signal?: AbortSignal,
) {
  const response = await fetchImpl(url, { signal, cache: "no-store" });
  let body: { success?: boolean; data?: T; pagination?: ApiPagination } | null =
    null;
  try {
    body = await response.json();
  } catch {
    throw new HttpStatusError(`Invalid response from ${url}`, response.status);
  }
  if (!response.ok || body?.success !== true) {
    throw new HttpStatusError(
      `Location API ${response.status}`,
      response.status,
    );
  }
  return body as { data: T; pagination?: ApiPagination };
}

async function fetchCrowdMap(
  fetchImpl: typeof fetch,
  signal: AbortSignal,
): Promise<{ ok: true; map: Map<string, ApiCrowdBuilding> } | { ok: false }> {
  try {
    const res = await getData<ApiCrowdBuilding[]>(
      fetchImpl,
      "/api/crowd/locations",
      signal,
    );
    if (!Array.isArray(res.data)) {
      return { ok: false };
    }
    return { ok: true, map: toCrowdBuildingMap(res.data) };
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    return { ok: false };
  }
}

async function fetchAllMatchingBuildings(
  fetchImpl: typeof fetch,
  search: string,
  signal: AbortSignal,
): Promise<ApiLocationBuilding[]> {
  const buildUrl = (page: number) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(filterFetchPageSize),
    });
    if (search !== "") {
      params.set("q", search.slice(0, maxSearchLength));
    }
    return `/api/locations?${params}`;
  };

  const first = await getData<ApiLocationBuilding[]>(
    fetchImpl,
    buildUrl(1),
    signal,
  );
  if (!Array.isArray(first.data) || !first.pagination) {
    throw new Error("Location API returned an unexpected list");
  }
  const buildings = [...first.data];
  const totalPages = first.pagination.total_pages;
  for (let page = 2; page <= totalPages; page += 1) {
    const next = await getData<ApiLocationBuilding[]>(
      fetchImpl,
      buildUrl(page),
      signal,
    );
    if (!Array.isArray(next.data)) {
      throw new Error("Location API returned an unexpected page");
    }
    buildings.push(...next.data);
  }
  return buildings;
}

export function createLocationApiSource(
  fetchImpl: typeof fetch = fetch,
): LocationDataSource {
  async function loadBuildingFloors(
    buildingId: BuildingId,
    signal: AbortSignal,
  ): Promise<BuildingFloorsResult> {
    const encodedId = encodeURIComponent(buildingId);
    const [detailOutcome, crowdOutcome] = await Promise.all([
      getData<{
        availability?: ApiAvailabilityDto;
        floors: ApiLocationFloor[];
      }>(fetchImpl, `/api/locations/${encodedId}`, signal),
      getData<{
        default_floor_id?: number | null;
        floors?: ApiCrowdFloor[];
      }>(fetchImpl, `/api/crowd/locations/${encodedId}`, signal).then(
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
      throw new Error("Location API returned an unexpected building");
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
      buildingAvailability: toAvailabilityModel(
        detailOutcome.data.availability,
      ),
    };
  }

  return {
    supportsCrowdFilter: true,

    async listBuildings({ search, crowdLevel, cursor }, signal) {
      if (crowdLevel !== null) {
        const [allBuildings, crowdOutcome] = await Promise.all([
          fetchAllMatchingBuildings(fetchImpl, search, signal),
          fetchCrowdMap(fetchImpl, signal),
        ]);
        if (!crowdOutcome.ok) {
          throw new Error("Crowd summary API unavailable");
        }
        const filtered = allBuildings
          .map((building) =>
            mergeBuildingWithCrowd(
              building,
              crowdOutcome.map.get(String(building.id)),
            ),
          )
          .filter((building) => building.crowdLevel === crowdLevel);

        return {
          buildings: filtered,
          nextCursor: null,
          totalCount: filtered.length,
        };
      }

      const params = new URLSearchParams({
        page: cursor ?? "1",
        limit: String(pageSize),
      });
      if (search !== "") {
        params.set("q", search.slice(0, maxSearchLength));
      }
      const [{ data, pagination }, crowdOutcome] = await Promise.all([
        getData<ApiLocationBuilding[]>(
          fetchImpl,
          `/api/locations?${params}`,
          signal,
        ),
        fetchCrowdMap(fetchImpl, signal),
      ]);
      if (!Array.isArray(data) || !pagination) {
        throw new Error("Location API returned an unexpected list");
      }
      const crowdMap = crowdOutcome.ok ? crowdOutcome.map : undefined;
      return {
        buildings: data.map((building) =>
          mergeBuildingWithCrowd(building, crowdMap?.get(String(building.id))),
        ),
        nextCursor:
          pagination.page < pagination.total_pages
            ? String(pagination.page + 1)
            : null,
        totalCount: pagination.total,
      };
    },

    async listFloors(buildingId: BuildingId, signal) {
      const result = await loadBuildingFloors(buildingId, signal);
      return result.floors;
    },

    loadBuildingFloors,
  };
}

export const locationApiSource: LocationDataSource = createLocationApiSource();
