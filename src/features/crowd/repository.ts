import { createClient } from "@/lib/supabase/server";

export async function readCrowdSummaries(locationId?: number, floorId?: number) {
  const client = await createClient();
  const { data, error } = await client.rpc("get_crowd_summaries", {
    p_location_id: locationId,
    p_floor_id: floorId,
  });
  if (error || !data) throw new Error("Crowd summary read failed");
  return data;
}
