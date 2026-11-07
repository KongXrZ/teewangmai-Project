import { CrowdLevelFilter } from "@/components/ui/crowd-level-filter";

export function MapPlaceholder() {
  return (
    <section
      aria-label="พื้นที่แผนที่ ว่างเพื่อรอ SVG"
      className="relative min-h-0 flex-1 rounded-[28px] bg-[#d9d9d9]"
    >
      <div className="absolute inset-x-3 top-3">
        <CrowdLevelFilter />
      </div>
    </section>
  );
}
