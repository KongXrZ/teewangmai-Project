import type { ReactNode } from "react";

export function MobileShell({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "app";
}) {
  const spacing =
    variant === "app"
      ? ""
      : "pt-[max(3rem,env(safe-area-inset-top))] pr-[max(1.5rem,env(safe-area-inset-right))] pb-[max(2rem,env(safe-area-inset-bottom))] pl-[max(1.5rem,env(safe-area-inset-left))]";

  return (
    <div
      className={`relative mx-auto flex min-h-dvh w-full max-w-[476px] flex-col ${variant === "app" ? "bg-[#f0f0f0]" : "bg-white"} text-[#141414] ${spacing}`}
    >
      {children}
    </div>
  );
}
