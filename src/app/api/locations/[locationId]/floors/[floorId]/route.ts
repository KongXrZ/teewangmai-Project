import { catalogError, catalogJson, catalogMeta } from "@/features/locations/api/http";
import { getLocationFloor } from "@/features/locations/api/repository";
import { locationIdSchema } from "@/features/locations/api/schemas";

export async function GET(_request: Request, context: { params: Promise<{ locationId: string; floorId: string }> }) {
  const params = await context.params;
  const locationId = locationIdSchema.safeParse(params.locationId);
  const floorId = locationIdSchema.safeParse(params.floorId);
  if (!locationId.success || !floorId.success) return catalogError("validation");
  try {
    const now = new Date();
    const data = await getLocationFloor(locationId.data, floorId.data, now);
    return data ? catalogJson({ success: true, data, meta: catalogMeta(now) }) : catalogError("not_found");
  } catch {
    return catalogError("unavailable");
  }
}
