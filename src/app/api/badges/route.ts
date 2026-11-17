import { createClient } from "@/lib/supabase/server";
import { badgesError, badgesJson } from "@/features/achievements/server/http";
import { badgeCollection } from "@/features/achievements/server/models";
import { readMyBadges } from "@/features/achievements/server/repository";

export async function GET(request: Request) {
  if (new URL(request.url).search) return badgesError("validation");
  try {
    const client = await createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return badgesError("unauthorized");
    return badgesJson(badgeCollection(await readMyBadges(client)));
  } catch {
    return badgesError("unavailable");
  }
}
