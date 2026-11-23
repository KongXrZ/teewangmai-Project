import { fetchCheckinHistoryPage } from "../../profile/components/checkin-history-client.ts";
import type { FloorId } from "./location-view-models";

// Matches the per-user/floor window enforced by submit_checkin.
const CHECKIN_COOLDOWN_MS = 30 * 60 * 1000;
const HISTORY_PAGE_SIZE = 50;

export async function loadCheckinCooldowns(signal: AbortSignal, now = Date.now()) {
  const cooldowns = new Map<FloorId, number>();
  let cursor: string | null = null;

  do {
    const page = await fetchCheckinHistoryPage({ limit: HISTORY_PAGE_SIZE, cursor, signal });
    if (!page.ok) throw new Error("Could not load check-in cooldowns");

    for (const checkin of page.items) {
      const deadline = Date.parse(checkin.created_at) + CHECKIN_COOLDOWN_MS;
      if (!Number.isFinite(deadline)) continue;
      // History is sorted newest first, so older pages cannot contain active cooldowns.
      if (deadline <= now) return cooldowns;
      const floorId = String(checkin.floor_id);
      if (!cooldowns.has(floorId)) cooldowns.set(floorId, deadline);
    }

    cursor = page.nextCursor;
  } while (cursor);

  return cooldowns;
}
