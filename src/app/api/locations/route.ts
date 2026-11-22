import { catalogError, catalogJson, catalogMeta } from "@/features/locations/api/http";
import { listLocations } from "@/features/locations/api/repository";
import { parseLocationQuery } from "@/features/locations/api/schemas";

export async function GET(request: Request) {
  const query = parseLocationQuery(new URL(request.url).searchParams);
  if (!query) return catalogError("validation");
  try {
    const now = new Date();
    const result = await listLocations(query, now);
    return catalogJson({ success: true, ...result, meta: catalogMeta(now) });
  } catch {
    return catalogError("unavailable");
  }
}
