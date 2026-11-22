import { Suspense } from "react";
import type { Metadata } from "next";
import { MobileShell } from "@/components/layout/mobile-shell";
import { LocationListContainer } from "@/features/locations/components/location-list-container";
import { LocationListPage } from "@/features/locations/components/location-list-page";

export const metadata: Metadata = {
  title: "รายการสถานที่ — TeeWangMai?",
};

export default function Locations() {
  return (
    <MobileShell variant="app">
      <Suspense fallback={<LocationListPage state={{ status: "loading" }} />}>
        <LocationListContainer />
      </Suspense>
    </MobileShell>
  );
}
