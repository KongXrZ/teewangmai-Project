import StarRounded from "@mui/icons-material/StarRounded";

const pointsFormatter = new Intl.NumberFormat("th-TH");

export function PointsSummary({ points }: { points: number | null }) {
  return (
    <section
      aria-label="แต้มของคุณ"
      aria-busy={points === null || undefined}
      className="flex items-center gap-4 rounded-2xl bg-[#f0f1f3] px-5 py-6"
    >
      <StarRounded
        aria-hidden="true"
        sx={{ fontSize: 56 }}
        className="shrink-0 text-[#e0622a]"
      />
      <div className="min-w-0">
        <p className="text-sm leading-5 text-[#6b7280]">แต้มของคุณ</p>
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
