"use server";

import { createClient } from "@/lib/supabase/server";
import {
  AUTH_UNAVAILABLE,
  getAuthErrorCode,
  getAuthErrorMessage,
} from "../errors";
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
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) throw new Error("Missing site URL");
    const callbackUrl = new URL("/auth/callback", siteUrl);
    if (!["http:", "https:"].includes(callbackUrl.protocol))
      throw new Error("Invalid site URL");
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
  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const callbackUrl = `${origin}/auth/callback${redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : ""}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl,
    },
  });

  if (error || !data.url) {
    return {
      success: false,
      error: error?.message ?? "ไม่สามารถสร้าง Google OAuth URL ได้",
    };
  }

  return { success: true, data: { url: data.url } };
}

export async function forgotPasswordAction(
  input: ForgotPasswordInput,
): Promise<AuthActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง",
    };
  }

  const { email } = parsed.data;
  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const redirectTo = `${origin}/auth/callback?next=/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    console.error("forgotPasswordAction error:", error.message);
  }

  return {
    success: true,
    message:
      "หากอีเมลนี้ลงทะเบียนไว้ในระบบ ลิงก์สำหรับตั้งรหัสผ่านใหม่จะถูกส่งไปยังกล่องข้อความของคุณ",
  };
}

export async function resetPasswordAction(
  input: ResetPasswordInput,
): Promise<AuthActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error:
        "ลิงก์รีเซ็ตรหัสผ่านหมดอายุหรือไม่ถูกต้อง กรุณาทำรายการใหม่อีกครั้ง",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    message:
      "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว สามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที",
  };
}

export async function resendVerificationEmailAction(
  input: ResendVerificationInput,
): Promise<AuthActionResult> {
  const parsed = resendVerificationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง",
    };
  }

  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    message: "ส่งลิงก์ยืนยันตัวตนไปยังอีเมลของคุณเรียบร้อยแล้ว",
  };
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
      if (
        error.name === "AuthSessionMissingError" ||
        [401, 403].includes(error.status ?? 0) ||
        [
          "session_not_found",
          "refresh_token_not_found",
          "refresh_token_already_used",
          "bad_jwt",
        ].includes(error.code ?? "")
      ) {
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
      error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" };
  }

  const { error } = await supabase
    .from("users")
    .update(parsed.data)
    .eq("auth_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, message: "อัปเดตโปรไฟล์เรียบร้อยแล้ว" };
}
