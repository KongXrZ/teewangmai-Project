import { createClient } from "@/lib/supabase/server";
import { buildingDto, floorDto } from "./models";
import type { z } from "zod";
import type { locationQuerySchema } from "./schemas";

// Explicit columns intentionally exclude QR identifiers, GPS and user activity.
const catalogColumns = `
  id, building, name, category, aliases, image_url, details,
  floors(id, location_id, floor_name, capacity,
    floor_hours(day_of_week, open_time, close_time, is_active))
` as const;

export async function listLocations(query: z.output<typeof locationQuerySchema>, now: Date) {
  const client = await createClient();
  const offset = (query.page - 1) * query.limit;
  const args = { search_term: query.q, category_filter: query.category };
  const result = await client
    .rpc("search_locations", args, { count: "exact" })
    .select(catalogColumns)
    .order("id", { ascending: true })
    .range(offset, offset + query.limit - 1);
  let { data, error, count } = result;
  // PostgREST returns 416/PGRST103 for an offset beyond the last row.
  // Recount without the range so a valid empty page still returns HTTP 200.
  if (error?.code === "PGRST103") {
    const recount = await client.rpc("search_locations", args, { count: "exact", head: true });
    data = [];
    count = recount.count;
    error = recount.error;
  }
  if (error || !data || count === null) throw new Error("Catalog query failed");
  return {
    data: data.map((building) => buildingDto(building, now)),
    pagination: {
      page: query.page, limit: query.limit, total: count,
      total_pages: Math.ceil(count / query.limit),
    },
  };
}

export async function getLocation(id: number, now: Date) {
  const client = await createClient();
  const { data, error } = await client.from("locations").select(catalogColumns)
    .eq("id", id).eq("is_active", true).maybeSingle();
  if (error) throw new Error("Catalog query failed");
  return data ? buildingDto(data, now, true) : null;
}

export async function getLocationFloor(locationId: number, floorId: number, now: Date) {
  const client = await createClient();
  const { data, error } = await client.from("floors")
    .select("id, location_id, floor_name, capacity, floor_hours(day_of_week, open_time, close_time, is_active), locations!inner(is_active)")
    .eq("location_id", locationId).eq("id", floorId).eq("is_active", true)
    .eq("locations.is_active", true).maybeSingle();
  if (error) throw new Error("Catalog query failed");
  return data ? floorDto(data, now) : null;
}
