import type { Metadata } from "next";
import { MobileShell } from "@/components/layout/mobile-shell";
import { BuildingDetailPage } from "@/features/locations/components/building-detail-page";

export const metadata: Metadata = {
  title: "รายละเอียดอาคาร — TeeWangMai?",
};

export default function BuildingDetail() {
  return (
    <MobileShell variant="app">
      <BuildingDetailPage state={{ status: "unavailable" }} />
    </MobileShell>
  );
}
