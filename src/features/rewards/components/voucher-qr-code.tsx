"use client";

import { useMemo } from "react";
import { buildVoucherQrShape } from "../voucher-qr";

export function VoucherQrCode({ code }: { code: string }) {
  const { viewBoxSize, path } = useMemo(
    () => buildVoucherQrShape(code),
    [code],
  );

  return (
    <svg
      role="img"
      aria-label="QR Code สำหรับใช้สิทธิ์"
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      shapeRendering="crispEdges"
      className="h-full w-full rounded-lg bg-white"
    >
      <path d={path} fill="#000000" />
    </svg>
  );
}
