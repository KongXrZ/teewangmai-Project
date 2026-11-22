import { signOutAction } from "@/features/auth/server/actions";
import { authJson, authStatus } from "@/features/auth/server/http";

export async function POST(request: Request) {
  if (new URL(request.url).search) {
    return authJson(
      { success: false, code: "validation", error: "พารามิเตอร์ไม่ถูกต้อง" },
      400,
    );
  }
  const result = await signOutAction();
  return authJson(result, authStatus(result));
}
