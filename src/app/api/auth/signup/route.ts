import { signUpWithPasswordAction } from "@/features/auth/server/actions";
import {
  authJson,
  authStatus,
  readAuthInput,
} from "@/features/auth/server/http";

export async function POST(request: Request) {
  const input = await readAuthInput(request);
  if (!input.success) return input.response;
  const result = await signUpWithPasswordAction(input.body);
  if (!result.success) return authJson(result, authStatus(result));
  return authJson({
    success: true,
    message: result.message,
    requiresEmailConfirmation: result.data?.requiresEmailConfirmation,
  });
}
