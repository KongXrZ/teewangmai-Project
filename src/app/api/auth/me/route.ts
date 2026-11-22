import { getCurrentUserAction } from "@/features/auth/server/actions";
import { authJson, authStatus } from "@/features/auth/server/http";

export async function GET(request: Request) {
  if (new URL(request.url).search) {
    return authJson(
      { success: false, code: "validation", error: "พารามิเตอร์ไม่ถูกต้อง" },
      400,
    );
  }
  const result = await getCurrentUserAction();
  if (!result.success) return authJson(result, authStatus(result));
  if (!result.data?.user) {
    return authJson(
      { success: false, error: "กรุณาเข้าสู่ระบบ", code: "unauthorized" },
      401,
    );
  }
  return authJson({ success: true, ...result.data });
}
