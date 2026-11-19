"use client";

import { useId, type ComponentPropsWithRef, type FormEvent } from "react";
import Search from "@mui/icons-material/Search";

export type SearchInputProps = Omit<
  ComponentPropsWithRef<"input">,
  "type" | "className" | "onSubmit"
> & {
  label: string;
  submitLabel?: string;
  onSubmit?: () => void;
};

export function SearchInput({
  id,
  label,
  submitLabel = "ยืนยันการค้นหา",
  onSubmit,
  ...inputProps
}: SearchInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit?.();
  }

  return (
    <form
      role="search"
      aria-label={label}
      onSubmit={handleFormSubmit}
      className="relative shrink-0"
    >
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <input
        {...inputProps}
        id={inputId}
        type="search"
        className="h-[50px] w-full rounded-full border-0 bg-white pr-[52px] pl-6 text-base text-[#081828] outline-none placeholder:text-[#929292] focus-visible:outline-2 focus-visible:outline-[#ff5815]"
      />
      {onSubmit ? (
        <button
          type="submit"
          aria-label={submitLabel}
          className="absolute top-1/2 right-1.5 inline-flex min-h-11 min-w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-[#888888] transition-colors hover:text-[#081828] focus-visible:outline-2 focus-visible:outline-[#ff5815]"
        >
          <Search aria-hidden="true" sx={{ fontSize: 22 }} />
        </button>
      ) : (
        <Search
          aria-hidden="true"
          sx={{ fontSize: 22 }}
          className="pointer-events-none absolute top-1/2 right-5 -translate-y-1/2 text-[#888888]"
        />
      )}
    </form>
  );
}
