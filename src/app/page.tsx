import { Suspense } from "react";
import type { Metadata } from "next";
import { MobileShell } from "@/components/layout/mobile-shell";
import { HomeMapContainer } from "@/features/home/components/home-map-container";
import { HomePage } from "@/features/home/components/home-page";

export const metadata: Metadata = {
  title: "หน้าหลัก — TeeWangMai?",
  description: "ดูความหนาแน่นของสถานที่ในมหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี",
};

export default function Home() {
  return (
    <MobileShell variant="app">
      <Suspense fallback={<HomePage isLoading />}>
        <HomeMapContainer />
      </Suspense>
    </MobileShell>
  );
}
