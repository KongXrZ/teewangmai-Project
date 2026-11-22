import { Suspense } from "react";
import type { Metadata } from "next";
import { MobileShell } from "@/components/layout/mobile-shell";
import { BuildingDetailContainer } from "@/features/locations/components/building-detail-container";
import { BuildingDetailPage } from "@/features/locations/components/building-detail-page";

export const metadata: Metadata = {
  title: "รายละเอียดอาคาร — TeeWangMai?",
};

export default async function BuildingDetail({
  params,
}: {
  params: Promise<{ buildingId: string }>;
}) {
  const { buildingId } = await params;

  return (
    <MobileShell variant="app">
      <Suspense fallback={<BuildingDetailPage state={{ status: "loading" }} />}>
        <BuildingDetailContainer buildingId={buildingId} />
      </Suspense>
    </MobileShell>
  );
}
