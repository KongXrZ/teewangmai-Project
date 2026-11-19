import { createClient } from "@/lib/supabase/server";
import type { BadgeRow } from "./models";

export async function readMyBadges(
  client: Awaited<ReturnType<typeof createClient>>,
  authId: string,
): Promise<BadgeRow[] | null> {
  const [profile, badges] = await Promise.all([
    client.from("users").select("id").eq("auth_id", authId).maybeSingle(),
    client.rpc("get_my_badges"),
  ]);
  if (profile.error || badges.error || !badges.data) throw new Error("Badge read failed");
  return profile.data ? badges.data : null;
}
