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
  context: { params: Promise<{ voucherId: string }> },
) {
  try {
    const session = await rewardsSession();
    if (session.failure) return rewardsError(session.failure);
    const { supabase } = session;

    const voucherId = parseRewardsId((await context.params).voucherId);
    const key = parseIdempotencyKey(request.headers.get("idempotency-key"));
    if (voucherId === null || key === null || new URL(request.url).search) {
      return rewardsError("validation");
    }

    const { data, error } = await supabase.rpc("use_voucher", {
      p_redemption_id: voucherId,
      p_use_key: key,
    });
    const row = data?.[0];
    if (error || !row) return rewardsError("unavailable");
    if (row.outcome !== "used") return outcomeError(row.outcome);

    return rewardsJson({
      id: row.id,
      used_at: row.used_at,
      use_code: row.use_code,
    });
  } catch {
    return rewardsError("unavailable");
  }
}
