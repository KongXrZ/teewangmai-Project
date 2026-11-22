import Link from "next/link";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import StarRounded from "@mui/icons-material/StarRounded";

const pointsFormatter = new Intl.NumberFormat("th-TH");

export function PointsSummary({
  points,
  vouchersHref,
}: {
  points: number | null;
  vouchersHref?: string;
}) {
  return (
    <section
      aria-label="แต้มของคุณ"
      aria-busy={points === null || undefined}
      className="relative flex items-center gap-4 rounded-2xl border border-[#e5e7eb] bg-white px-5 py-6"
    >
      {vouchersHref && (
        <Link
          href={vouchersHref}
          className="absolute top-1.5 right-2.5 flex min-h-11 items-center rounded-lg pl-2 text-sm font-semibold text-[#c9531f] no-underline touch-manipulation hover:text-[#b84a1b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e0622a]"
        >
          สิทธิ์ของฉัน
          <ChevronRightRounded aria-hidden="true" sx={{ fontSize: 20 }} />
        </Link>
      )}
      <StarRounded
        aria-hidden="true"
        sx={{ fontSize: 56 }}
        className="shrink-0 text-[#e0622a]"
      />
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm leading-5 text-[#6b7280] ${
            vouchersHref ? "pr-24" : ""
          }`}
        >
          แต้มของคุณ
        </p>
        {points === null ? (
          <span className="mt-1.5 block h-8 w-32 animate-pulse rounded-lg bg-[#dfe1e5]" />
        ) : (
          <p className="text-[28px] leading-9 font-bold text-[#e0622a]">
            {pointsFormatter.format(points)} แต้ม
          </p>
        )}
      </div>
    </section>
  );
}
