import { signOutAction } from "@/features/auth/server/actions";
import { authJson, authStatus } from "@/features/auth/server/http";

export async function POST() {
  const result = await signOutAction();
  return authJson(result, authStatus(result));
}
