import { createClient } from "@/lib/supabase/server";
import { badgesError, badgesJson } from "@/features/achievements/server/http";
import { badgeCollection } from "@/features/achievements/server/models";
import { readMyBadges } from "@/features/achievements/server/repository";
import { isLostSession } from "@/features/profile/server/checkin-history";

export async function GET(request: Request) {
  if (new URL(request.url).search) return badgesError("validation");
  try {
    const client = await createClient();
    const {
      data: { user },
      error,
    } = await client.auth.getUser();
    if (error && !isLostSession(error)) return badgesError("unavailable");
    if (!user) return badgesError("unauthorized");
    const rows = await readMyBadges(client, user.id);
    if (!rows) return badgesError("unauthorized");
    return badgesJson(badgeCollection(rows));
  } catch {
    return badgesError("unavailable");
  }
}
