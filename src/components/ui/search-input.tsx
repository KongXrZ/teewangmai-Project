"use client";

import { useId, type ComponentPropsWithRef } from "react";
import Search from "@mui/icons-material/Search";

export type SearchInputProps = Omit<
  ComponentPropsWithRef<"input">,
  "type" | "className"
> & {
  label: string;
};

export function SearchInput({ id, label, ...inputProps }: SearchInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <section aria-label={label} className="relative shrink-0">
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <Search
        aria-hidden="true"
        sx={{ fontSize: 22 }}
        className="pointer-events-none absolute top-1/2 right-5 -translate-y-1/2 text-[#888888]"
      />
      <input
        {...inputProps}
        id={inputId}
        type="search"
        className="h-[50px] w-full rounded-full border-0 bg-white pr-[50px] pl-6 text-base text-[#081828] outline-none placeholder:text-[#929292] focus-visible:outline-2 focus-visible:outline-[#ff5815]"
      />
    </section>
  );
}
