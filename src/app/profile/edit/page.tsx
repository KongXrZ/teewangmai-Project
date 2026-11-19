import type { Metadata } from "next";
import { MobileShell } from "@/components/layout/mobile-shell";
import { EditProfileContainer } from "@/features/profile/components/edit-profile-container";

export const metadata: Metadata = {
  title: "แก้ไขข้อมูลส่วนตัว — TeeWangMai?",
};

export default function EditProfile() {
  return (
    <MobileShell variant="app">
      <EditProfileContainer />
    </MobileShell>
  );
}
