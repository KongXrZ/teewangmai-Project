import type { CrowdLevelFilterValue } from "@/components/ui/crowd-level-filter";

export type BuildingId = string;

export type CrowdLevel = Exclude<CrowdLevelFilterValue, "all">;

export interface BuildingCardModel {
  id: BuildingId;
  code: string;
  name: string;
  imageUrl: string | null;
  crowdLevel: CrowdLevel | null;
  updatedAt: string | null;
}

export type LocationListState =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "error" }
  | { status: "ready"; buildings: BuildingCardModel[] };

export type BuildingSelectHandler = (id: BuildingId) => void;

export type FloorId = string;

export interface OpeningHours {
  open: string;
  close: string;
}

export interface CrowdEstimate {
  estimatedPeople: number | null;
  densityPercent: number | null;
}

export interface FloorStatsModel extends CrowdEstimate {
  openingHours: OpeningHours | null;
}

export type FloorCrowdState =
  | { status: "loading" }
  | { status: "error" }
  | ({
      status: "ready";
      level: CrowdLevel | null;
      updatedAt: string | null;
    } & CrowdEstimate);

export interface FloorDetailItem {
  label: string;
  value: string;
}

export interface FloorModel {
  id: FloorId;
  label: string;
  openingHours: OpeningHours | null;
  crowd: FloorCrowdState;
  details: FloorDetailItem[];
}

export interface BuildingDetailModel {
  id: BuildingId;
  code: string;
  name: string;
  imageUrl: string | null;
  floors: FloorModel[];
}

export type BuildingDetailState =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "error" }
  | { status: "ready"; building: BuildingDetailModel };

export type FloorListState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; floors: FloorModel[] };

export interface ExpandedBuildingModel {
  buildingId: BuildingId;
  floors: FloorListState;
}

export type FloorSelectHandler = (floorId: FloorId) => void;
