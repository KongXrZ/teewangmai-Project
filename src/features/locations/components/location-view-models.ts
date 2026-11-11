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
  | {
      status: "ready";
      buildings: BuildingCardModel[];
      totalCount?: number | null;
    };

export type BuildingSelectHandler = (id: BuildingId) => void;
