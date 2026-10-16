import type { Metadata } from "next";
import { MobileShell } from "@/components/layout/mobile-shell";
import { AuthPageLayout } from "@/features/auth/components/auth-page-layout";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Log in — TeeWangMai?",
};

export default function LoginPage() {
  return (
    <MobileShell>
      <AuthPageLayout
        title="Log in"
        switchPrompt="ยังไม่มีบัญชี?"
        switchHref="/signup"
        switchLabel="ไปหน้า Sign up"
      >
        <LoginForm />
      </AuthPageLayout>
    </MobileShell>
  );
}
