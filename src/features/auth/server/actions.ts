"use server";

import { createClient } from "@/lib/supabase/server";
import { removeOtherAvatars } from "@/features/profile/server/avatar-storage";
import { isLostSession } from "@/features/profile/server/checkin-history";
import {
  AUTH_UNAVAILABLE,
  getAuthErrorCode,
  getAuthErrorMessage,
  resolveProfileUpdateOutcome,
} from "../errors";
import { getSafeRedirectPath, resolveSiteOrigin } from "../redirects";
import type { AuthActionResult, CurrentUser, SignupOutcome } from "../types";
import {
  forgotPasswordSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  updateProfileSchema,
  type ForgotPasswordInput,
  type ResendVerificationInput,
  type ResetPasswordInput,
  type UpdateProfileInput,
} from "../schemas";

export type { AuthActionResult } from "../types";

export async function signUpWithPasswordAction(
  input: unknown,
): Promise<AuthActionResult<SignupOutcome>> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation",
      error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง",
    };
  }

  try {
    const origin = resolveSiteOrigin();
    if (!origin) {
      return { success: false, error: AUTH_UNAVAILABLE, code: "unavailable" };
    }
    const callbackUrl = new URL("/auth/callback", origin);
    const supabase = await createClient();
    const { email, password, name } = parsed.data;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name }, emailRedirectTo: callbackUrl.toString() },
    });
    if (error)
      return {
        success: false,
        error: getAuthErrorMessage(error),
        code: getAuthErrorCode(error),
      };
    return {
      success: true,
      data: { requiresEmailConfirmation: !data.session },
      message: data.session
        ? "สมัครสมาชิกสำเร็จและเข้าสู่ระบบเรียบร้อยแล้ว"
        : "กรุณาตรวจสอบอีเมลเพื่อยืนยันตัวตนก่อนเข้าสู่ระบบ หากเคยสมัครแล้วสามารถเข้าสู่ระบบหรือใช้ช่องทางกู้รหัสผ่านได้",
    };
  } catch {
    return { success: false, error: AUTH_UNAVAILABLE, code: "unavailable" };
  }
}

export async function signInWithPasswordAction(
  input: unknown,
): Promise<AuthActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation",
      error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง",
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) {
      return {
        success: false,
        error: getAuthErrorMessage(error),
        code: getAuthErrorCode(error),
      };
    }
    return { success: true, message: "เข้าสู่ระบบสำเร็จ" };
  } catch {
    return { success: false, error: AUTH_UNAVAILABLE, code: "unavailable" };
  }
}

export async function getGoogleOAuthUrlAction(
  redirectTo?: string,
): Promise<AuthActionResult<{ url: string }>> {
  try {
    const origin = resolveSiteOrigin();
    if (!origin) {
      return { success: false, code: "unavailable", error: AUTH_UNAVAILABLE };
    }

    const supabase = await createClient();
    const callbackUrl = new URL("/auth/callback", origin);
    if (redirectTo) {
      callbackUrl.searchParams.set("next", getSafeRedirectPath(redirectTo));
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });

    if (error || !data.url) {
      return {
        success: false,
        code: error ? getAuthErrorCode(error) : "unavailable",
        error: error ? getAuthErrorMessage(error) : AUTH_UNAVAILABLE,
      };
    }

    return { success: true, data: { url: data.url } };
  } catch {
    return { success: false, code: "unavailable", error: AUTH_UNAVAILABLE };
  }
}

export async function forgotPasswordAction(
  input: ForgotPasswordInput,
): Promise<AuthActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation",
      error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง",
    };
  }

  try {
    const origin = resolveSiteOrigin();
    if (!origin) {
      return { success: false, code: "unavailable", error: AUTH_UNAVAILABLE };
    }

    const { email } = parsed.data;
    const supabase = await createClient();
    const redirectTo = new URL(
      "/auth/callback?next=/reset-password",
      origin,
    ).toString();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      console.error(
        "forgotPasswordAction error:",
        error.code ?? error.name ?? "unknown",
      );
    }

    return {
      success: true,
      message:
        "หากอีเมลนี้ลงทะเบียนไว้ในระบบ ลิงก์สำหรับตั้งรหัสผ่านใหม่จะถูกส่งไปยังกล่องข้อความของคุณ",
    };
  } catch {
    return { success: false, code: "unavailable", error: AUTH_UNAVAILABLE };
  }
}

export async function resetPasswordAction(
  input: ResetPasswordInput,
): Promise<AuthActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation",
      error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง",
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError && !isLostSession(authError)) {
      return { success: false, code: "unavailable", error: AUTH_UNAVAILABLE };
    }

    if (!user) {
      return {
        success: false,
        code: "unauthorized",
        error:
          "ลิงก์รีเซ็ตรหัสผ่านหมดอายุหรือไม่ถูกต้อง กรุณาทำรายการใหม่อีกครั้ง",
      };
    }

    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });

    if (error) {
      return {
        success: false,
        code: getAuthErrorCode(error),
        error: getAuthErrorMessage(error),
      };
    }

    return {
      success: true,
      message:
        "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว สามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที",
    };
  } catch {
    return { success: false, code: "unavailable", error: AUTH_UNAVAILABLE };
  }
}

export async function resendVerificationEmailAction(
  input: ResendVerificationInput,
): Promise<AuthActionResult> {
  const parsed = resendVerificationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation",
      error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง",
    };
  }

  try {
    const origin = resolveSiteOrigin();
    if (!origin) {
      return { success: false, code: "unavailable", error: AUTH_UNAVAILABLE };
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: parsed.data.email,
      options: {
        emailRedirectTo: new URL("/auth/callback", origin).toString(),
      },
    });

    if (error) {
      return {
        success: false,
        code: getAuthErrorCode(error),
        error: getAuthErrorMessage(error),
      };
    }

    return {
      success: true,
      message: "ส่งลิงก์ยืนยันตัวตนไปยังอีเมลของคุณเรียบร้อยแล้ว",
    };
  } catch {
    return { success: false, code: "unavailable", error: AUTH_UNAVAILABLE };
  }
}

export async function signOutAction(): Promise<AuthActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (
      error &&
      !["session_not_found", "refresh_token_not_found"].includes(
        error.code ?? "",
      )
    ) {
      return { success: false, error: AUTH_UNAVAILABLE, code: "unavailable" };
    }
    return { success: true, message: "ออกจากระบบสำเร็จ" };
  } catch {
    return { success: false, error: AUTH_UNAVAILABLE, code: "unavailable" };
  }
}

export async function getCurrentUserAction(): Promise<
  AuthActionResult<CurrentUser>
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) {
      if (isLostSession(error)) {
        return { success: true, data: { user: null, profile: null } };
      }
      return { success: false, error: AUTH_UNAVAILABLE, code: "unavailable" };
    }
    if (!user) return { success: true, data: { user: null, profile: null } };
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, auth_id, name, email, avatar_url, points, created_at")
      .eq("auth_id", user.id)
      .single();
    if (profileError)
      return { success: false, error: AUTH_UNAVAILABLE, code: "unavailable" };
    return {
      success: true,
      data: { user: { id: user.id, email: user.email ?? null }, profile },
    };
  } catch {
    return { success: false, error: AUTH_UNAVAILABLE, code: "unavailable" };
  }
}

export async function updateProfileAction(
  input: UpdateProfileInput,
): Promise<AuthActionResult> {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation",
      error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง",
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError && !isLostSession(authError)) {
      return { success: false, code: "unavailable", error: AUTH_UNAVAILABLE };
    }

    if (!user) {
      return {
        success: false,
        code: "unauthorized",
        error: "กรุณาเข้าสู่ระบบก่อนทำรายการ",
      };
    }

    const { data: updated, error } = await supabase
      .from("users")
      .update(parsed.data)
      .eq("auth_id", user.id)
      .select("id");

    const outcome = resolveProfileUpdateOutcome(updated, error);
    if (!outcome.success) {
      return outcome;
    }

    if (parsed.data.avatar_url !== undefined) {
      await removeOtherAvatars(supabase, user.id, parsed.data.avatar_url).catch(
        () => undefined,
      );
    }

    return outcome;
  } catch {
    return { success: false, code: "unavailable", error: AUTH_UNAVAILABLE };
  }
}
