import type { createClient } from "@/lib/supabase/server";
import { AVATAR_BUCKET, avatarObjectPath } from "../avatar";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export async function removeOtherAvatars(
  supabase: ServerClient,
  authId: string,
  keepUrl: string | null | undefined,
) {
  const keep = avatarObjectPath(keepUrl);
  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .list(authId, { limit: 1000 });
  if (error || !data) return;
  const files = data.map((file) => ({
    path: `${authId}/${file.name}`,
    createdAt: file.created_at,
  }));
  const kept = files.find((file) => file.path === keep);
  const stale = files
    .filter((file) => file.path !== keep)
    .filter((file) => !kept || (file.createdAt ?? "") < (kept.createdAt ?? ""))
    .map((file) => file.path);
  if (stale.length > 0) {
    await supabase.storage.from(AVATAR_BUCKET).remove(stale);
  }
}
