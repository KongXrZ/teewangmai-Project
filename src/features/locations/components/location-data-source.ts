import type {
  BuildingAvailabilityModel,
  BuildingCardModel,
  BuildingId,
  CrowdLevel,
  FloorId,
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

export interface BuildingFloorsResult {
  floors: FloorModel[];
  defaultFloorId: FloorId | null;
  buildingAvailability?: BuildingAvailabilityModel;
}

export interface LocationDataSource {
  supportsCrowdFilter: boolean;
  listBuildings(
    query: BuildingQuery,
    signal: AbortSignal,
  ): Promise<BuildingPage>;
  listFloors(buildingId: BuildingId, signal: AbortSignal): Promise<FloorModel[]>;
  loadBuildingFloors?(
    buildingId: BuildingId,
    signal: AbortSignal,
  ): Promise<BuildingFloorsResult>;
}
