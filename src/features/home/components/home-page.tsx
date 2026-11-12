import Link from "next/link";
import { AppBottomNavigation } from "@/components/layout/app-bottom-navigation";
import { SearchInput } from "@/components/ui/search-input";
import { MapPlaceholder } from "./map-placeholder";

export function HomePage() {
  return (
    <>
      <div className="flex min-w-0 flex-1">
        <main className="flex min-h-0 flex-1 flex-col gap-2.5 px-6 pt-[max(2.25rem,env(safe-area-inset-top,0px))] pb-[calc(7.625rem+env(safe-area-inset-bottom,0px))] text-[#081828] sm:px-9">
          <header className="shrink-0 text-center">
            <Link
              href="/"
              className="block text-[2.5rem] leading-[1.2] font-bold tracking-[-0.035em]"
            >
              TeeWangMai?
            </Link>
            <p className="mt-0.5 text-base leading-snug">
              ตรวจสอบความหนาแน่นของคนในอาคารที่คุณจะไป
            </p>
          </header>

          <SearchInput
            id="location-search"
            label="ค้นหาสถานที่"
            placeholder="ค้นหาสถานที่..."
          />

          <MapPlaceholder />
        </main>
      </div>
      <AppBottomNavigation selected="home" />
    </>
  );
}
