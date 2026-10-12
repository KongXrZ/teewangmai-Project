import type { ReactNode } from "react";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  fallback: ["Tahoma", "sans-serif"],
});

/** Phone-width column used by every page: full width on phones, centered at most 430px on larger screens. */
export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${inter.className} mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-white pt-[max(3rem,env(safe-area-inset-top))] pr-[max(1.5rem,env(safe-area-inset-right))] pb-[max(2rem,env(safe-area-inset-bottom))] pl-[max(1.5rem,env(safe-area-inset-left))] text-[#141414]`}
    >
      {children}
    </div>
  );
}
