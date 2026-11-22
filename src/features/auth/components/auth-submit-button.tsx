import type { ComponentPropsWithoutRef } from "react";

type AuthSubmitButtonProps = Omit<
  ComponentPropsWithoutRef<"button">,
  "type" | "className"
>;

export function AuthSubmitButton({
  children,
  ...buttonProps
}: AuthSubmitButtonProps) {
  return (
    <button
      type="submit"
      className="h-13 w-full rounded-lg bg-[#194569] text-base text-white hover:opacity-90 active:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#194569] disabled:cursor-not-allowed disabled:opacity-60"
      {...buttonProps}
    >
      {children}
    </button>
  );
}
