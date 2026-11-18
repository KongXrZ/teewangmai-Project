import type { ReactNode } from "react";
import ArrowBackIosNewRounded from "@mui/icons-material/ArrowBackIosNewRounded";

export const primaryButtonClass =
  "flex h-[52px] w-full cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-[14px] border-0 bg-[#ea580c] px-4 text-base font-semibold text-white transition-colors duration-150 [-webkit-tap-highlight-color:transparent] hover:bg-[#d24f0b] active:bg-[#bb460a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#081828]";

export const secondaryButtonClass =
  "flex h-[52px] w-full cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-[14px] border border-[#e5e7eb] bg-white px-4 text-base font-semibold text-[#141414] transition-colors duration-150 [-webkit-tap-highlight-color:transparent] hover:bg-[#f7f7f8] active:bg-[#f0f1f3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#081828] disabled:cursor-not-allowed disabled:text-[#9ca3af]";

export const pageMainClass =
  "flex min-w-0 flex-1 flex-col bg-white px-5 pb-[calc(7.625rem+env(safe-area-inset-bottom,0px))] sm:px-8";

export function SkeletonBlock({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block bg-[#eceef1] motion-safe:animate-pulse ${className}`}
    />
  );
}

export function StateMessage({
  icon,
  tone,
  title,
  description,
  role,
  headingLevel = 2,
  children,
}: {
  icon: ReactNode;
  tone: "brand" | "danger";
  title: string;
  description: ReactNode;
  role?: "alert";
  headingLevel?: 2 | 3;
  children?: ReactNode;
}) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  return (
    <section
      role={role}
      className="mx-auto flex w-full max-w-[400px] flex-1 flex-col items-center justify-center gap-3 py-10 text-center"
    >
      <span
        className={`mb-2 flex h-[92px] w-[92px] items-center justify-center rounded-full ${
          tone === "danger"
            ? "bg-[#fdecec] text-[#dc2626]"
            : "bg-[#fdebe0] text-[#ea580c]"
        }`}
      >
        {icon}
      </span>
      <Heading className="text-xl leading-snug font-semibold text-[#141414]">
        {title}
      </Heading>
      <p className="text-[15px] leading-relaxed text-balance text-[#6b7280]">
        {description}
      </p>
      {children && (
        <div className="mt-4 flex w-full flex-col gap-3">{children}</div>
      )}
    </section>
  );
}

export function PageHeader({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) {
  return (
    <header className="-mx-5 flex items-center gap-1 border-b border-[#e5e7eb] px-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-2 sm:-mx-8 sm:px-6">
      <button
        type="button"
        onClick={onBack}
        aria-label="ย้อนกลับ"
        className="flex h-11 w-11 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-full border-0 bg-transparent text-[#141414] transition-colors duration-150 [-webkit-tap-highlight-color:transparent] hover:bg-[#f0f1f3] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#ea580c]"
      >
        <ArrowBackIosNewRounded aria-hidden="true" sx={{ fontSize: 20 }} />
      </button>
      <h1 className="min-w-0 truncate text-[22px] leading-tight font-semibold text-[#141414]">
        {title}
      </h1>
    </header>
  );
}
