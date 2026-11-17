import { createClient } from "@/lib/supabase/server";
import type { BadgeRow } from "./models";

export async function readMyBadges(client: Awaited<ReturnType<typeof createClient>>): Promise<BadgeRow[]> {
  const { data, error } = await client.rpc("get_my_badges");
  if (error || !data) throw new Error("Badge read failed");
  return data;
}
