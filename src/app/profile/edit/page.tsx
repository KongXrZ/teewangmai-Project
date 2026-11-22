import type { Metadata } from "next";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ProtectedContent } from "@/features/auth/components/guest-state";
import { EditProfileContainer } from "@/features/profile/components/edit-profile-container";

export const metadata: Metadata = {
  title: "แก้ไขข้อมูลส่วนตัว — TeeWangMai?",
};

export default function EditProfile() {
  return (
    <MobileShell variant="app">
      <ProtectedContent
        title="แก้ไขข้อมูลส่วนตัว"
        description="เข้าสู่ระบบเพื่อแก้ไขชื่อและรูปโปรไฟล์ของคุณ"
        selected="profile"
      >
        <EditProfileContainer />
      </ProtectedContent>
    </MobileShell>
  );
}
