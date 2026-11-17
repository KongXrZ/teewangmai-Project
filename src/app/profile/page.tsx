import type { Metadata } from "next";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ProfileContainer } from "@/features/profile/components/profile-container";

export const metadata: Metadata = {
  title: "โปรไฟล์ — TeeWangMai?",
};

export default function Profile() {
  return (
    <MobileShell variant="app">
      <ProfileContainer />
    </MobileShell>
  );
}
