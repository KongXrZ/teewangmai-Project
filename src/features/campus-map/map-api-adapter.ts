import type { CrowdLevelFilterValue } from "@/components/ui/crowd-level-filter";
import type {
  BuildingCardModel,
  CrowdLevel,
  FloorCrowdState,
  FloorModel,
  OpeningHours,
} from "@/features/locations/components/location-view-models";
import type { CrowdFilterValue } from "./map-state";

export interface ApiLocationInterval {
  readonly open_time: string;
  readonly close_time: string;
}

export interface ApiLocationBuilding {
  readonly id: number;
  readonly building: string;
  readonly name: string;
  readonly image_url: string | null;
}

export interface ApiLocationFloor {
  readonly id: number;
  readonly floor_name: string;
  readonly availability: {
    readonly status: "open" | "closed" | "unknown";
    readonly today_intervals: readonly ApiLocationInterval[];
  };
}

export type CrowdSummaryStatus = "ready" | "unknown" | "pending" | "stale";

export interface ApiCrowdFloor {
  readonly floor_id: number;
  readonly floor_name: string;
  readonly capacity: number | null;
  readonly status: CrowdSummaryStatus;
  readonly estimated_people: number | null;
  readonly report_count: number | null;
  readonly current_crowd_level: number | null;
  readonly level: CrowdLevel | null;
  readonly density_percent: number | null;
  readonly latest_report_at: string | null;
  readonly calculated_at: string | null;
  readonly window_start: string | null;
}

export interface ApiCrowdBuilding {
  readonly location_id: number;
  readonly default_floor_id: number | null;
  readonly busiest_floor: ApiCrowdFloor | null;
}

export interface CampusMapBuilding extends BuildingCardModel {
  readonly isActive: boolean;
  readonly defaultFloorId: string | null;
  readonly crowdStatus: CrowdSummaryStatus;
}

export interface MapSearchResolution {
  readonly filteredResults: BuildingCardModel[];
  readonly highlightedBuildingIds: string[];
  readonly exactMatchBuilding: BuildingCardModel | null;
}

export function toCrowdBuildingMap(
  items: readonly ApiCrowdBuilding[],
): Map<string, ApiCrowdBuilding> {
  const map = new Map<string, ApiCrowdBuilding>();
  for (const item of items) {
    map.set(String(item.location_id), item);
  }
  return map;
}

export function mergeBuildingWithCrowd(
  building: ApiLocationBuilding,
  crowd?: ApiCrowdBuilding,
): CampusMapBuilding {
  const busiest = crowd?.busiest_floor ?? null;
  const isReady = busiest?.status === "ready";
  return {
    id: String(building.id),
    code: building.building,
    name: building.name,
    imageUrl: building.image_url,
    crowdLevel: isReady ? busiest.level : null,
    updatedAt: isReady
      ? (busiest.latest_report_at ?? busiest.calculated_at)
      : null,
    isActive: true,
    defaultFloorId:
      crowd?.default_floor_id != null ? String(crowd.default_floor_id) : null,
    crowdStatus: busiest?.status ?? "unknown",
  };
}

function toOpeningHours(
  availability: ApiLocationFloor["availability"],
): OpeningHours | "closed" | null {
  if (availability.today_intervals.length === 1) {
    return {
      open: availability.today_intervals[0].open_time,
      close: availability.today_intervals[0].close_time,
    };
  }
  return availability.today_intervals.length === 0 &&
    availability.status === "closed"
    ? "closed"
    : null;
}

function toFloorCrowdState(
  crowdFloor: ApiCrowdFloor | undefined,
  crowdFailed: boolean,
): FloorCrowdState {
  if (crowdFailed) {
    return { status: "error" };
  }
  if (crowdFloor?.status === "ready") {
    return {
      status: "ready",
      level: crowdFloor.level,
      updatedAt: crowdFloor.latest_report_at ?? crowdFloor.calculated_at,
      estimatedPeople: crowdFloor.estimated_people,
      densityPercent: crowdFloor.density_percent,
    };
  }
  return {
    status: "ready",
    level: null,
    updatedAt: null,
    estimatedPeople: null,
    densityPercent: null,
  };
}

export function mergeBuildingFloors(
  catalogFloors: readonly ApiLocationFloor[],
  crowdFloors?: readonly ApiCrowdFloor[],
  crowdFailed = false,
): FloorModel[] {
  const crowdByFloorId = new Map<string, ApiCrowdFloor>();
  if (crowdFloors) {
    for (const floor of crowdFloors) {
      crowdByFloorId.set(String(floor.floor_id), floor);
    }
  }

  return catalogFloors.map((floor) => {
    const id = String(floor.id);
    return {
      id,
      label: floor.floor_name,
      openingHours: toOpeningHours(floor.availability),
      crowd: toFloorCrowdState(crowdByFloorId.get(id), crowdFailed),
      details: [],
    };
  });
}

export function resolveMapSearch(
  query: string,
  matches: readonly BuildingCardModel[],
  crowdFilter: CrowdFilterValue,
): MapSearchResolution {
  const normalized = query.trim().toLowerCase();
  if (normalized === "") {
    return {
      filteredResults: [],
      highlightedBuildingIds: [],
      exactMatchBuilding: null,
    };
  }

  const filteredResults =
    crowdFilter === "all"
      ? [...matches]
      : matches.filter((item) => item.crowdLevel === crowdFilter);

  if (filteredResults.length === 1) {
    const only = filteredResults[0];
    if (
      only.code.toLowerCase() === normalized ||
      only.name.toLowerCase() === normalized
    ) {
      return {
        filteredResults,
        highlightedBuildingIds: [only.id],
        exactMatchBuilding: only,
      };
    }
  }

  return {
    filteredResults,
    highlightedBuildingIds: filteredResults.map((item) => item.id),
    exactMatchBuilding: null,
  };
}

export function findConfirmedSearchBuilding(
  query: string,
  filteredResults: readonly BuildingCardModel[],
): BuildingCardModel | null {
  const normalized = query.trim().toLowerCase();
  if (normalized === "" || filteredResults.length === 0) {
    return null;
  }

  const exactCodeMatch = filteredResults.find(
    (item) => item.code.toLowerCase() === normalized,
  );
  if (exactCodeMatch) {
    return exactCodeMatch;
  }

  const exactNameMatch = filteredResults.find(
    (item) => item.name.toLowerCase() === normalized,
  );
  if (exactNameMatch) {
    return exactNameMatch;
  }

  return filteredResults.length === 1 ? filteredResults[0] : null;
}

const VALID_CROWD_FILTERS: readonly CrowdLevel[] = ["low", "medium", "high"];

export function parseCrowdFilterParam(
  value: string | null,
): CrowdLevelFilterValue {
  return VALID_CROWD_FILTERS.find((item) => item === value) ?? "all";
}

export function buildHomeQueryString({
  search,
  crowdFilter,
  selectedBuildingId,
  includeFromHome = false,
}: {
  search: string;
  crowdFilter: CrowdLevelFilterValue;
  selectedBuildingId: string | null;
  includeFromHome?: boolean;
}): string {
  const params = new URLSearchParams();
  if (includeFromHome) {
    params.set("from", "home");
  }
  const trimmed = search.trim();
  if (trimmed !== "") {
    params.set("q", trimmed);
  }
  if (crowdFilter !== "all") {
    params.set("level", crowdFilter);
  }
  if (selectedBuildingId) {
    params.set("building", selectedBuildingId);
  }
  return params.toString();
}
