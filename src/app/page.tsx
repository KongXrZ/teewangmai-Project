import type { Metadata } from "next";
import { MobileShell } from "@/components/layout/mobile-shell";
import { HomePage } from "@/features/home/components/home-page";

export const metadata: Metadata = {
  title: "หน้าหลัก — TeeWangMai?",
  description: "ดูความหนาแน่นของสถานที่ในมหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี",
};

export default function Home() {
  return (
    <MobileShell variant="app">
      <HomePage />
    </MobileShell>
  );
}
