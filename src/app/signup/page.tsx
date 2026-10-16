import type { Metadata } from "next";
import { MobileShell } from "@/components/layout/mobile-shell";
import { AuthPageLayout } from "@/features/auth/components/auth-page-layout";
import { SignupForm } from "@/features/auth/components/signup-form";

export const metadata: Metadata = {
  title: "Sign up — TeeWangMai?",
};

export default function SignupPage() {
  return (
    <MobileShell>
      <AuthPageLayout
        title="Sign up"
        switchPrompt="มีบัญชีแล้ว?"
        switchHref="/login"
        switchLabel="ไปหน้า Log in"
      >
        <SignupForm />
      </AuthPageLayout>
    </MobileShell>
  );
}
