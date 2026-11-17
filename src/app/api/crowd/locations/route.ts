import { crowdError, crowdJson } from "@/features/crowd/http";
import { buildingCards } from "@/features/crowd/models";
import { readCrowdSummaries } from "@/features/crowd/repository";

export async function GET(request: Request) {
  if (new URL(request.url).search) return crowdError("validation");
  try {
    return crowdJson(buildingCards(await readCrowdSummaries()));
  } catch {
    return crowdError("unavailable");
  }
}
