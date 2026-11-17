import {
  outcomeError,
  parseIdempotencyKey,
  parseRewardsId,
  rewardsError,
  rewardsJson,
  rewardsSession,
} from "@/features/rewards/server/http";

export async function POST(
  request: Request,
  context: { params: Promise<{ rewardId: string }> },
) {
  try {
    const session = await rewardsSession();
    if (session.failure) return rewardsError(session.failure);
    const { supabase } = session;

    const rewardId = parseRewardsId((await context.params).rewardId);
    const key = parseIdempotencyKey(request.headers.get("idempotency-key"));
    if (rewardId === null || key === null || new URL(request.url).search) {
      return rewardsError("validation");
    }

    const { data, error } = await supabase.rpc("redeem_reward", {
      p_reward_id: rewardId,
      p_idempotency_key: key,
    });
    const row = data?.[0];
    if (error || !row) return rewardsError("unavailable");
    if (row.outcome !== "redeemed" && row.outcome !== "replayed") {
      return outcomeError(row.outcome);
    }

    return rewardsJson({
      replayed: row.outcome === "replayed",
      points: row.points,
      voucher: {
        id: row.redemption_id,
        reward_id: row.reward_id,
        used_points: row.used_points,
        redeemed_at: row.redeemed_at,
        expires_at: row.expires_at,
      },
    });
  } catch {
    return rewardsError("unavailable");
  }
}
