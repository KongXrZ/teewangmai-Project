import { crowdError, crowdJson, parseCrowdId } from "@/features/crowd/http";
import { buildingSummary } from "@/features/crowd/models";
import { readCrowdSummaries } from "@/features/crowd/repository";

export async function GET(request: Request, context: { params: Promise<{ locationId: string }> }) {
  const id = parseCrowdId((await context.params).locationId);
  if (id === null || new URL(request.url).search) return crowdError("validation");
  try {
    const rows = await readCrowdSummaries(id);
    return rows.length ? crowdJson(buildingSummary(rows)) : crowdError("not_found");
  } catch {
    return crowdError("unavailable");
  }
}
