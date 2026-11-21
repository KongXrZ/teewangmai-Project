import type { Metadata } from "next";
import { MobileShell } from "@/components/layout/mobile-shell";
import { AuthPageLayout } from "@/features/auth/components/auth-page-layout";
import { LoginForm } from "@/features/auth/components/login-form";
import {
  getSafeRedirectPath,
  withRedirectParam,
} from "@/features/auth/redirects";

export const metadata: Metadata = {
  title: "Log in — TeeWangMai?",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string | string[];
    error?: string | string[];
  }>;
}) {
  const query = await searchParams;
  const next = typeof query.next === "string" ? query.next : undefined;
  return (
    <MobileShell>
      <AuthPageLayout
        title="Log in"
        switchPrompt="ยังไม่มีบัญชี?"
        switchHref={withRedirectParam("/signup", next)}
        switchLabel="ไปหน้า Sign up"
      >
        <LoginForm
          redirectTo={getSafeRedirectPath(next)}
          initialError={
            query.error === "verification_failed"
              ? "ลิงก์ยืนยันตัวตนหมดอายุหรือไม่ถูกต้อง กรุณาลองใหม่"
              : undefined
          }
        />
      </AuthPageLayout>
    </MobileShell>
  );
}
