import type { CrowdLevel } from "@/features/locations/components/location-view-models";
import type { ReportHistoryItem } from "./profile-view-models";

export interface CheckinHistoryDto {
  id: number;
  location_name: string;
  floor_name: string;
  crowd_level: number;
  created_at: string;
}

export type CheckinHistoryResult =
  | {
      ok: true;
      reports: ReportHistoryItem[];
      nextCursor: string | null;
      total: number | null;
    }
  | { ok: false; unauthorized: boolean };

export function crowdLevelFromReport(level: number): CrowdLevel {
  return level < 2.5 ? "low" : level < 3.5 ? "medium" : "high";
}

export function toReportHistoryItem(row: CheckinHistoryDto): ReportHistoryItem {
  return {
    id: String(row.id),
    placeName: `${row.location_name} · ชั้น ${row.floor_name}`,
    reportedAt: row.created_at,
    level: crowdLevelFromReport(row.crowd_level),
  };
}

export async function fetchCheckinHistory(
  options: { limit?: number; cursor?: string | null; signal?: AbortSignal } = {},
): Promise<CheckinHistoryResult> {
  const params = new URLSearchParams();
  if (options.limit) params.set("limit", String(options.limit));
  if (options.cursor) params.set("cursor", options.cursor);
  const query = params.toString();
  const response = await fetch(`/api/profile/checkins${query ? `?${query}` : ""}`, {
    credentials: "same-origin",
    cache: "no-store",
    signal: options.signal,
  });
  if (!response.ok) return { ok: false, unauthorized: response.status === 401 };
  const body = (await response.json()) as {
    success?: boolean;
    data?: { items?: CheckinHistoryDto[]; next_cursor?: string | null; total?: number };
  };
  if (!body.success || !Array.isArray(body.data?.items)) {
    return { ok: false, unauthorized: false };
  }
  return {
    ok: true,
    reports: body.data.items.map(toReportHistoryItem),
    nextCursor: body.data.next_cursor ?? null,
    total: typeof body.data.total === "number" ? body.data.total : null,
  };
}
