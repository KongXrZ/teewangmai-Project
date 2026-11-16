export function Spinner({
  className = "h-4 w-4 border-2 border-white/35 border-t-white",
}: {
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 rounded-full motion-safe:animate-spin ${className}`}
    />
  );
}
