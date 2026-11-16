import type {
  BuildingCardModel,
  BuildingId,
  CrowdLevel,
  FloorModel,
} from "./location-view-models";

export interface BuildingQuery {
  search: string;
  crowdLevel: CrowdLevel | null;
  cursor: string | null;
}

export interface BuildingPage {
  buildings: BuildingCardModel[];
  nextCursor: string | null;
  totalCount: number | null;
}

export interface LocationDataSource {
  supportsCrowdFilter: boolean;
  listBuildings(
    query: BuildingQuery,
    signal: AbortSignal,
  ): Promise<BuildingPage>;
  listFloors(buildingId: BuildingId, signal: AbortSignal): Promise<FloorModel[]>;
}
