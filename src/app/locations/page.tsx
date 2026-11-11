import type { Metadata } from "next";
import { MobileShell } from "@/components/layout/mobile-shell";
import { LocationListPage } from "@/features/locations/components/location-list-page";

export const metadata: Metadata = {
  title: "รายการสถานที่ — TeeWangMai?",
};

export default function Locations() {
  return (
    <MobileShell variant="app">
      <LocationListPage state={{ status: "unavailable" }} />
    </MobileShell>
  );
}
