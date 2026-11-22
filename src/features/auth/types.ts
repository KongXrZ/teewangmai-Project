import type { Database } from "@/types/database";

export type AuthUser = { id: string; email: string | null };
export type UserProfile = Database["public"]["Tables"]["users"]["Row"];
export type CurrentUser = {
  user: AuthUser | null;
  profile: UserProfile | null;
};
export type SignupOutcome = { requiresEmailConfirmation: boolean };

export type AuthActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  code?:
    "validation" | "unauthorized" | "rejected" | "rate_limited" | "unavailable";
};
