import type { Metadata } from "next";
import { MobileShell } from "@/components/layout/mobile-shell";
import { AuthPageLayout } from "@/features/auth/components/auth-page-layout";
import { SignupForm } from "@/features/auth/components/signup-form";
import { withRedirectParam } from "@/features/auth/redirects";

export const metadata: Metadata = {
  title: "Sign up — TeeWangMai?",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const query = await searchParams;
  const next = typeof query.next === "string" ? query.next : undefined;
  return (
    <MobileShell>
      <AuthPageLayout
        title="Sign up"
        switchPrompt="มีบัญชีแล้ว?"
        switchHref={withRedirectParam("/login", next)}
        switchLabel="ไปหน้า Log in"
      >
        <SignupForm redirectTo={next} />
      </AuthPageLayout>
    </MobileShell>
  );
}
