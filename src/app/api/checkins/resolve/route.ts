import { readAuthInput } from "@/features/auth/server/http";
import {
  checkinError,
  checkinJson,
  checkinSession,
} from "@/features/checkins/server/http";
import { resolveSchema } from "@/features/checkins/server/request";

export async function POST(request: Request) {
  try {
    const session = await checkinSession();
    if (session.failure) return checkinError(session.failure);
    const { supabase } = session;

    const input = await readAuthInput(request);
    if (!input.success) return input.response;
    if (new URL(request.url).search) return checkinError("validation");
    const parsed = resolveSchema.safeParse(input.body);
    if (!parsed.success) {
      const body = input.body as Record<string, unknown> | null;
      const onlyQr =
        body !== null &&
        typeof body === "object" &&
        !Array.isArray(body) &&
        Object.keys(body).length === 1 &&
        typeof body.qr === "string";
      return checkinError(onlyQr ? "invalid_qr" : "validation");
    }

    const [profile, floor] = await Promise.all([
      supabase.from("users").select("id").eq("auth_id", session.user.id).maybeSingle(),
      supabase.rpc("resolve_floor_qr", { p_qr_code_id: parsed.data.qr }),
    ]);
    if (profile.error || floor.error) return checkinError("unavailable");
    if (!profile.data) return checkinError("unauthorized");
    const row = floor.data[0];
    if (!row) return checkinError("invalid_qr");

    return checkinJson({
      floor_ref: parsed.data.qr,
      location: {
        id: row.location_id,
        building: row.building,
        name: row.location_name,
        image_url: row.image_url,
      },
      floor: { id: row.floor_id, name: row.floor_name },
    });
  } catch {
    return checkinError("unavailable");
  }
}
