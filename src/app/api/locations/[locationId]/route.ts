import { catalogError, catalogJson, catalogMeta } from "@/features/locations/api/http";
import { getLocation } from "@/features/locations/api/repository";
import { locationIdSchema } from "@/features/locations/api/schemas";

export async function GET(_request: Request, context: { params: Promise<{ locationId: string }> }) {
  const id = locationIdSchema.safeParse((await context.params).locationId);
  if (!id.success) return catalogError("validation");
  try {
    const now = new Date();
    const data = await getLocation(id.data, now);
    return data ? catalogJson({ success: true, data, meta: catalogMeta(now) }) : catalogError("not_found");
  } catch {
    return catalogError("unavailable");
  }
}
