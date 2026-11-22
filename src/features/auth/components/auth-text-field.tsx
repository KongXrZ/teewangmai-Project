import type { ComponentPropsWithRef } from "react";

type AuthTextFieldProps = Omit<
  ComponentPropsWithRef<"input">,
  "id" | "className" | "name"
> & {
  name: string;
  label: string;
  error?: string;
};

export function AuthTextField({
  name,
  label,
  error,
  ...inputProps
}: AuthTextFieldProps) {
  const errorId = `${name}-error`;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={name} className="text-base leading-tight">
        {label}
      </label>
      <input
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="h-13 w-full rounded-lg border border-[#D9D9D9] bg-[#F7F7F7] px-4 text-base text-[#141414] placeholder:text-[#8E8E8E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#194569] aria-invalid:border-red-700"
        {...inputProps}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-sm leading-tight text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
