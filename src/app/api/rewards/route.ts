import {
  rewardsError,
  rewardsJson,
  rewardsSession,
} from "@/features/rewards/server/http";

export async function GET(request: Request) {
  try {
    const session = await rewardsSession();
    if (session.failure) return rewardsError(session.failure);
    const { supabase, user } = session;
    if (new URL(request.url).search) return rewardsError("validation");

    const [profile, catalog] = await Promise.all([
      supabase.from("users").select("points").eq("auth_id", user.id).maybeSingle(),
      supabase.rpc("get_reward_catalog"),
    ]);
    if (profile.error || catalog.error) return rewardsError("unavailable");
    if (!profile.data) return rewardsError("unauthorized");

    return rewardsJson({ points: profile.data.points, rewards: catalog.data });
  } catch {
    return rewardsError("unavailable");
  }
}
