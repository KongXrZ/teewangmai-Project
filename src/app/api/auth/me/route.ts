import { getCurrentUserAction } from "@/features/auth/server/actions";
import { authJson, authStatus } from "@/features/auth/server/http";

export async function GET() {
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
