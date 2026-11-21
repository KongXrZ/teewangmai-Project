"use client";

import { useState } from "react";
import type { CameraStatus } from "../scanner-state";
import type { QrDetectHandler, QuickScanVerification } from "../types";
import { QrScanner } from "./qr-scanner";
import { Spinner } from "./spinner";

export interface QuickScanPanelProps {
  verification?: QuickScanVerification;
  onDetect?: QrDetectHandler;
  onRescan?: () => void;
}

export function QuickScanPanel({
  verification = { status: "idle" },
  onDetect,
  onRescan,
}: QuickScanPanelProps) {
  const [round, setRound] = useState(0);
  const [scannerStatus, setScannerStatus] = useState<CameraStatus>("idle");

  function handleRescan() {
    setRound((current) => current + 1);
    onRescan?.();
  }

  const canRescan =
    scannerStatus === "detected" &&
    (verification.status === "idle" || verification.status === "rejected");

  return (
    <div className="flex flex-col gap-3">
      <QrScanner
        onDetect={onDetect}
        round={round}
        verifying={verification.status === "verifying"}
        onStatusChange={setScannerStatus}
      />
      <div className="flex flex-col items-center gap-2 empty:hidden">
        <VerificationStatus verification={verification} />
        {canRescan && (
          <button
            type="button"
            onClick={handleRescan}
            className="min-h-11 cursor-pointer touch-manipulation rounded-full border-2 border-[#ff5815] bg-white px-6 text-sm font-semibold text-[#ff5815] transition-colors hover:bg-[#fff1ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#081828] active:bg-[#ffe2d4]"
          >
            สแกนใหม่
          </button>
        )}
      </div>
    </div>
  );
}

function VerificationStatus({
  verification,
}: {
  verification: QuickScanVerification;
}) {
  switch (verification.status) {
    case "idle":
      return null;
    case "verifying":
      return (
        <p
          role="status"
          className="flex min-h-11 w-full items-center justify-center gap-2.5 rounded-full bg-[#ff8a5c] px-4 text-base font-semibold text-white"
        >
          <Spinner className="h-5 w-5 border-2 border-white/35 border-t-white" />
          กำลังตรวจสอบ
        </p>
      );
    case "resolved":
      return (
        <p
          role="status"
          className="flex min-h-11 w-full items-center justify-center rounded-full bg-[#ff5815] px-4 py-2 text-center text-base leading-snug font-semibold break-words text-white"
        >
          {verification.label}
        </p>
      );
    case "rejected":
      return (
        <p
          role="alert"
          className="w-full rounded-2xl bg-[#ffecec] px-4 py-3 text-center text-sm leading-snug text-[#b3261e]"
        >
          {verification.message ??
            "ไม่สามารถตรวจสอบ QR Code นี้ได้ โปรดสแกนใหม่"}
        </p>
      );
  }
}
