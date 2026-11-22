import { signInWithPasswordAction } from "@/features/auth/server/actions";
import {
  authJson,
  authStatus,
  readAuthInput,
} from "@/features/auth/server/http";

export async function POST(request: Request) {
  const input = await readAuthInput(request);
  if (!input.success) return input.response;
  const result = await signInWithPasswordAction(input.body);
  return authJson(result, authStatus(result));
}
