import Link from "next/link";
import type { ReactNode } from "react";

type AuthPageLayoutProps = {
  title: string;
  switchHref: string;
  switchLabel: string;
  children: ReactNode;
};

export function AuthPageLayout({
  title,
  switchHref,
  switchLabel,
  children,
}: AuthPageLayoutProps) {
  return (
    <main className="mx-auto flex w-full max-w-[300px] flex-1 flex-col">
      <h1 className="text-[28px] leading-tight">{title}</h1>
      <div className="mt-12">{children}</div>
      <p className="mt-3 text-center text-sm">
        <Link
          href={switchHref}
          className="inline-flex min-h-11 items-center hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#194569]"
        >
          {switchLabel}
        </Link>
      </p>
    </main>
  );
}
