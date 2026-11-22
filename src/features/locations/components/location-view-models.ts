import type { CrowdLevelFilterValue } from "@/components/ui/crowd-level-filter";

export type BuildingId = string;

export type CrowdLevel = Exclude<CrowdLevelFilterValue, "all">;

export type CrowdSummaryStatus = "ready" | "unknown" | "pending" | "stale";

export type AvailabilityStatus = "open" | "closed" | "unknown";

export interface BuildingAvailabilityModel {
  status: AvailabilityStatus;
  displayHours: string | null;
}

export interface FloorCrowdMeta {
  status: CrowdSummaryStatus;
  latestReportAt: string | null;
  calculatedAt: string | null;
}

export interface BuildingCardModel {
  id: BuildingId;
  code: string;
  name: string;
  imageUrl: string | null;
  crowdLevel: CrowdLevel | null;
  updatedAt: string | null;
  crowdStatus?: CrowdSummaryStatus;
  latestReportAt?: string | null;
  calculatedAt?: string | null;
  buildingAvailability?: BuildingAvailabilityModel;
}

export type LocationListState =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "error" }
  | {
      status: "ready";
      buildings: BuildingCardModel[];
      totalCount?: number | null;
    };

export type BuildingSelectHandler = (id: BuildingId, floorId?: FloorId) => void;

export type FloorId = string;

export interface OpeningHours {
  open: string;
  close: string;
  display?: string;
}

export interface CrowdEstimate {
  estimatedPeople: number | null;
  densityPercent: number | null;
}

export interface FloorStatsModel extends CrowdEstimate {
  openingHours: OpeningHours | "closed" | null;
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
  openingHours: OpeningHours | "closed" | null;
  crowd: FloorCrowdState;
  details: FloorDetailItem[];
  availabilityStatus?: AvailabilityStatus;
  crowdMeta?: FloorCrowdMeta;
}

export interface BuildingDetailModel {
  id: BuildingId;
  code: string;
  name: string;
  imageUrl: string | null;
  floors: FloorModel[];
  availability?: BuildingAvailabilityModel;
  categories?: string[];
  aliases?: string[];
  description?: string | null;
  metadataDetails?: FloorDetailItem[];
}

export type BuildingDetailState =
  | { status: "loading" }
  | { status: "not_found" }
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
  defaultFloorId?: FloorId | null;
  buildingAvailability?: BuildingAvailabilityModel;
}

export type FloorSelectHandler = (floorId: FloorId) => void;
