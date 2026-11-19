import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { readAuthInput } from "@/features/auth/server/http";
import { rewardsError, rewardsJson } from "@/features/rewards/server/http";

const verifySchema = z.object({ code: z.string().trim().toLowerCase() }).strict();

export async function POST(request: Request) {
  try {
    const input = await readAuthInput(request);
    if (!input.success) return input.response;
    const parsed = verifySchema.safeParse(input.body);
    if (!parsed.success || new URL(request.url).search) return rewardsError("validation");

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("verify_voucher_code", {
      p_use_code: parsed.data.code,
    });
    const row = data?.[0];
    if (error || !row) return rewardsError("unavailable");
    if (row.outcome === "not_found") return rewardsError("not_found");

    const voucher = {
      reward_title: row.reward_title,
      used_points: row.used_points,
      used_at: row.used_at,
      verified_at: row.verified_at,
    };
    if (row.outcome === "verified") return rewardsJson(voucher);
    if (row.outcome === "already_verified") return rewardsError("already_verified", voucher);
    if (row.outcome === "expired") return rewardsError("expired", voucher);
    return rewardsError("unavailable");
  } catch {
    return rewardsError("unavailable");
  }
}
