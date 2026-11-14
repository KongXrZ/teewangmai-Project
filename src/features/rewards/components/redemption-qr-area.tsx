import { useId, type ReactNode } from "react";

export function RedemptionQrArea({
  children,
  instruction = "ยื่น QR Code นี้ให้พนักงานเพื่อรับสิทธิ์",
}: {
  children: ReactNode;
  instruction?: string;
}) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className="mt-5 flex flex-col items-center"
    >
      <h3 id={titleId} className="text-[15px] leading-6 font-semibold">
        QR Code สำหรับแลกสิทธิ์
      </h3>
      <div className="mt-3 flex aspect-square w-full max-w-[200px] items-center justify-center rounded-2xl bg-[#f0f1f3] p-3">
        {children}
      </div>
      <p className="mt-3 text-center text-[13px] leading-5 text-[#6b7280]">
        {instruction}
      </p>
    </section>
  );
}
