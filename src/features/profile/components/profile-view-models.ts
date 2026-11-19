import type { CrowdLevel } from "@/features/locations/components/location-view-models";

export interface ProfileModel {
  name: string;
  avatarUrl: string | null;
  points: number;
  reportCount: number | null;
  badgeCount: number;
}

export type ProfileState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "error" }
  | { status: "ready"; profile: ProfileModel };

export interface ReportHistoryItem {
  id: string;
  placeName: string;
  reportedAt: string;
  level: CrowdLevel;
}

export type ReportHistoryState =
  | { status: "loading" }
  | { status: "error" }
  | {
      status: "ready";
      reports: ReportHistoryItem[];
      hasMore?: boolean;
      loadingMore?: boolean;
      loadMoreFailed?: boolean;
    };

export type ReportHistoryFilter = "all" | "week" | "month";
