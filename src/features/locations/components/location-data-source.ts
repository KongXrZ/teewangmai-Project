import type { BuildingCardModel, CrowdLevel } from "./location-view-models";

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
  listBuildings(
    query: BuildingQuery,
    signal: AbortSignal,
  ): Promise<BuildingPage>;
}
