import {
  rewardsError,
  rewardsJson,
  rewardsSession,
} from "@/features/rewards/server/http";

export async function GET(request: Request) {
  try {
    const { supabase, user } = await rewardsSession();
    if (!user) return rewardsError("unauthorized");
    if (new URL(request.url).search) return rewardsError("validation");

    const [profile, vouchers] = await Promise.all([
      supabase.from("users").select("id").eq("auth_id", user.id).maybeSingle(),
      supabase.rpc("get_my_vouchers"),
    ]);
    if (profile.error || vouchers.error) return rewardsError("unavailable");
    if (!profile.data) return rewardsError("unauthorized");

    return rewardsJson(vouchers.data);
  } catch {
    return rewardsError("unavailable");
  }
}
