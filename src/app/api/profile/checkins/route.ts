import { createClient } from "@/lib/supabase/server";
import { authJson } from "@/features/auth/server/http";
import {
  encodeHistoryCursor,
  isLostSession,
  parseHistoryQuery,
} from "@/features/profile/server/checkin-history";

function fail(status: number, code: string, error: string) {
  return authJson({ success: false, code, error }, status);
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error && !isLostSession(error)) {
      return fail(503, "unavailable", "โหลดประวัติไม่สำเร็จ โปรดลองใหม่อีกครั้ง");
    }
    if (!user) return fail(401, "unauthorized", "กรุณาเข้าสู่ระบบก่อนทำรายการ");

    const query = parseHistoryQuery(new URL(request.url).searchParams);
    if (!query) return fail(400, "validation", "พารามิเตอร์ไม่ถูกต้อง");

    const [profile, page] = await Promise.all([
      supabase.from("users").select("id").eq("auth_id", user.id).maybeSingle(),
      supabase.rpc("get_my_checkins", {
        p_limit: query.limit + 1,
        p_before_created_at: query.cursor?.created_at,
        p_before_id: query.cursor?.id,
      }),
    ]);
    if (profile.error || page.error) {
      return fail(503, "unavailable", "โหลดประวัติไม่สำเร็จ โปรดลองใหม่อีกครั้ง");
    }
    if (!profile.data) return fail(401, "unauthorized", "กรุณาเข้าสู่ระบบก่อนทำรายการ");

    const items = page.data
      .slice(0, query.limit)
      .map((row) => ({
        id: row.id,
        location_id: row.location_id,
        building: row.building,
        location_name: row.location_name,
        floor_id: row.floor_id,
        floor_name: row.floor_name,
        crowd_level: row.crowd_level,
        created_at: row.created_at,
      }));
    const last = items.at(-1);
    return authJson({
      success: true,
      data: {
        items,
        next_cursor:
          page.data.length > query.limit && last
            ? encodeHistoryCursor({ created_at: last.created_at, id: last.id })
            : null,
        ...(query.cursor ? {} : { total: page.data[0]?.matching_count ?? 0 }),
      },
    });
  } catch {
    return fail(503, "unavailable", "โหลดประวัติไม่สำเร็จ โปรดลองใหม่อีกครั้ง");
  }
}
