import { createClient } from "@/lib/supabase/server";
import { authJson } from "@/features/auth/server/http";
import { isLostSession } from "@/features/profile/server/checkin-history";

function fail(status: number, code: string, error: string) {
  return authJson({ success: false, code, error }, status);
}

export async function GET(request: Request) {
  if (new URL(request.url).search) {
    return fail(400, "validation", "พารามิเตอร์ไม่ถูกต้อง");
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error && !isLostSession(error)) {
      return fail(503, "unavailable", "โหลดข้อมูลสตรีคไม่สำเร็จ โปรดลองใหม่อีกครั้ง");
    }
    if (!user) return fail(401, "unauthorized", "กรุณาเข้าสู่ระบบก่อนทำรายการ");

    const { data, error: streakError } = await supabase.rpc("get_my_streak");
    if (streakError) {
      return fail(503, "unavailable", "โหลดข้อมูลสตรีคไม่สำเร็จ โปรดลองใหม่อีกครั้ง");
    }
    const row = data?.[0];
    if (!row) {
      return fail(401, "unauthorized", "กรุณาเข้าสู่ระบบก่อนทำรายการ");
    }

    return authJson({
      success: true,
      data: {
        current_streak: row.current_streak,
        longest_streak: row.longest_streak,
        checked_in_today: row.checked_in_today,
        last_checkin_date: row.last_checkin_date,
      },
    });
  } catch {
    return fail(503, "unavailable", "โหลดข้อมูลสตรีคไม่สำเร็จ โปรดลองใหม่อีกครั้ง");
  }
}
