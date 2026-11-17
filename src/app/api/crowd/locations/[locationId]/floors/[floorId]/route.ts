import { crowdError, crowdJson, parseCrowdId } from "@/features/crowd/http";
import { floorSummary } from "@/features/crowd/models";
import { readCrowdSummaries } from "@/features/crowd/repository";

export async function GET(request: Request, context: { params: Promise<{ locationId: string; floorId: string }> }) {
  const params = await context.params;
  const locationId = parseCrowdId(params.locationId);
  const floorId = parseCrowdId(params.floorId);
  if (locationId === null || floorId === null || new URL(request.url).search) return crowdError("validation");
  try {
    const rows = await readCrowdSummaries(locationId, floorId);
    return rows[0] ? crowdJson(floorSummary(rows[0])) : crowdError("not_found");
  } catch {
    return crowdError("unavailable");
  }
}
