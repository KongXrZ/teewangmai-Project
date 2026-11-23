import type { CrowdLevel } from "@/features/locations/components/location-view-models";
import type { ReportHistoryItem } from "./profile-view-models";

export interface CheckinHistoryDto {
  id: number;
  location_name: string;
  floor_id: number;
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

type CheckinHistoryOptions = { limit?: number; cursor?: string | null; signal?: AbortSignal };

export async function fetchCheckinHistoryPage(options: CheckinHistoryOptions = {}) {
  const params = new URLSearchParams();
  if (options.limit) params.set("limit", String(options.limit));
  if (options.cursor) params.set("cursor", options.cursor);
  const query = params.toString();
  const response = await fetch(`/api/profile/checkins${query ? `?${query}` : ""}`, {
    credentials: "same-origin",
    cache: "no-store",
    signal: options.signal,
  });
  if (!response.ok) return { ok: false as const, unauthorized: response.status === 401 };
  const body = (await response.json()) as {
    success?: boolean;
    data?: { items?: CheckinHistoryDto[]; next_cursor?: string | null; total?: number };
  };
  if (!body.success || !Array.isArray(body.data?.items)) {
    return { ok: false as const, unauthorized: false };
  }
  return {
    ok: true as const,
    items: body.data.items,
    nextCursor: body.data.next_cursor ?? null,
    total: typeof body.data.total === "number" ? body.data.total : null,
  };
}

export async function fetchCheckinHistory(
  options: CheckinHistoryOptions = {},
): Promise<CheckinHistoryResult> {
  const page = await fetchCheckinHistoryPage(options);
  if (!page.ok) return page;
  return {
    ok: true,
    reports: page.items.map(toReportHistoryItem),
    nextCursor: page.nextCursor,
    total: page.total,
  };
}
