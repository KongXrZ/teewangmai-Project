import { readAuthInput } from "@/features/auth/server/http";
import {
  checkinError,
  checkinJson,
  checkinSession,
  outcomeCode,
} from "@/features/checkins/server/http";
import { submitSchema } from "@/features/checkins/server/request";

export async function POST(request: Request) {
  try {
    const session = await checkinSession();
    if (session.failure) return checkinError(session.failure);
    const { supabase } = session;

    const input = await readAuthInput(request);
    if (!input.success) return input.response;
    const parsed = submitSchema.safeParse(input.body);
    if (!parsed.success || new URL(request.url).search) {
      return checkinError("validation");
    }

    const { data, error } = await supabase.rpc("submit_checkin", {
      p_qr_code_id: parsed.data.qr,
      p_crowd_level: parsed.data.crowd_level,
      p_latitude: parsed.data.latitude,
      p_longitude: parsed.data.longitude,
      p_accuracy_meters: parsed.data.accuracy_meters,
    });
    const row = data?.[0];
    if (error || !row) return checkinError("unavailable");

    if (row.outcome === "cooldown") {
      return checkinError("cooldown", { next_eligible_at: row.next_eligible_at });
    }
    if (row.outcome === "out_of_range") {
      return checkinError("out_of_range", { distance_meters: row.distance_meters });
    }
    if (row.outcome !== "recorded") return checkinError(outcomeCode(row.outcome));

    return checkinJson(
      {
        id: row.checkin_id,
        location: { id: row.location_id, building: row.building, name: row.location_name },
        floor: { id: row.floor_id, name: row.floor_name },
        crowd_level: row.crowd_level,
        created_at: row.created_at,
        next_eligible_at: row.next_eligible_at,
        points_awarded: row.points_awarded,
        points_balance: row.points_balance,
      },
      201,
    );
  } catch {
    return checkinError("unavailable");
  }
}
