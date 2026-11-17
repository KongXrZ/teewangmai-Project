import type {
  BuildingCardModel,
  BuildingId,
  FloorModel,
  OpeningHours,
} from "./location-view-models";
import type { LocationDataSource } from "./location-data-source";

const pageSize = 20;
const maxSearchLength = 200;

interface ApiInterval {
  open_time: string;
  close_time: string;
}

interface ApiBuilding {
  id: number;
  building: string;
  name: string;
  image_url: string | null;
}

interface ApiFloor {
  id: number;
  floor_name: string;
  availability: {
    status: "open" | "closed" | "unknown";
    today_intervals: ApiInterval[];
  };
}

interface ApiPagination {
  page: number;
  total: number;
  total_pages: number;
}

async function getData<T>(url: string, signal?: AbortSignal) {
  const response = await fetch(url, { signal, cache: "no-store" });
  const body = await response.json();
  if (!response.ok || body?.success !== true) {
    throw new Error(`Location API ${response.status}`);
  }
  return body as { data: T; pagination?: ApiPagination };
}

export function toBuildingCard(building: ApiBuilding): BuildingCardModel {
  return {
    id: String(building.id),
    code: building.building,
    name: building.name,
    imageUrl: building.image_url,
    crowdLevel: null,
    updatedAt: null,
  };
}

function toOpeningHours({
  status,
  today_intervals: intervals,
}: ApiFloor["availability"]): OpeningHours | "closed" | null {
  if (intervals.length === 1) {
    return { open: intervals[0].open_time, close: intervals[0].close_time };
  }
  return intervals.length === 0 && status === "closed" ? "closed" : null;
}

export function toFloor(floor: ApiFloor): FloorModel {
  return {
    id: String(floor.id),
    label: floor.floor_name,
    openingHours: toOpeningHours(floor.availability),
    crowd: {
      status: "ready",
      level: null,
      updatedAt: null,
      estimatedPeople: null,
      densityPercent: null,
    },
    details: [],
  };
}

export const locationApiSource: LocationDataSource = {
  supportsCrowdFilter: false,

  async listBuildings({ search, cursor }, signal) {
    const params = new URLSearchParams({
      page: cursor ?? "1",
      limit: String(pageSize),
    });
    if (search !== "") {
      params.set("q", search.slice(0, maxSearchLength));
    }
    const { data, pagination } = await getData<ApiBuilding[]>(
      `/api/locations?${params}`,
      signal,
    );
    if (!Array.isArray(data) || !pagination) {
      throw new Error("Location API returned an unexpected list");
    }
    return {
      buildings: data.map(toBuildingCard),
      nextCursor:
        pagination.page < pagination.total_pages
          ? String(pagination.page + 1)
          : null,
      totalCount: pagination.total,
    };
  },

  async listFloors(buildingId: BuildingId, signal) {
    const { data } = await getData<{ floors: ApiFloor[] }>(
      `/api/locations/${encodeURIComponent(buildingId)}`,
      signal,
    );
    if (!Array.isArray(data?.floors)) {
      throw new Error("Location API returned an unexpected building");
    }
    return data.floors.map(toFloor);
  },
};
