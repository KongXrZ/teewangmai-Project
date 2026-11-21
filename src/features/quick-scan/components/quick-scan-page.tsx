"use client";

import { useState } from "react";
import ArrowBackIosNewRounded from "@mui/icons-material/ArrowBackIosNewRounded";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import type { CameraStatus } from "../scanner-state";
import type { QrDetectHandler, QuickScanVerification } from "../types";
import { QrScanner } from "./qr-scanner";
import { Spinner } from "./spinner";

export interface QuickScanPageProps {
  verification?: QuickScanVerification;
  onDetect?: QrDetectHandler;
  onRescan?: () => void;
  onBack?: () => void;
}

export function QuickScanPage({
  verification = { status: "idle" },
  onDetect,
  onRescan,
  onBack,
}: QuickScanPageProps) {
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
    <>
      <main className="flex min-w-0 flex-1 flex-col px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-[calc(7.625rem+env(safe-area-inset-bottom,0px))] text-black min-[400px]:px-[22px]">
        <header className="flex items-start gap-1.5 pl-1.5">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="ย้อนกลับไปเลือกระดับความหนาแน่น"
              className="mt-1.5 flex min-h-11 min-w-11 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-full border-0 bg-white text-black shadow-sm transition-colors hover:bg-[#fff1ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff5815] active:bg-[#ffe2d4]"
            >
              <ArrowBackIosNewRounded
                aria-hidden="true"
                sx={{ fontSize: 20 }}
              />
            </button>
          )}
          <span
            aria-hidden="true"
            className="mt-1.5 h-[55px] w-2 shrink-0 rounded-full bg-[#ff5815]"
          />
          <div className="min-w-0">
            <h1 className="text-[clamp(2rem,8vw,2.375rem)] leading-[1.2] font-bold">
              เช็คอิน
            </h1>
            <p className="text-base leading-snug font-medium text-[#878787]">
              สแกน QR Code ประจำชั้นเพื่อรายงานความหนาแน่น
            </p>
          </div>
        </header>

        <div className="mt-3 px-1.5">
          <QrScanner
            onDetect={onDetect}
            round={round}
            verifying={verification.status === "verifying"}
            onStatusChange={setScannerStatus}
          />
        </div>

        <div className="mt-3 flex flex-col items-center gap-2 px-1.5">
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
      </main>
      <BottomNavigation selected="scan" />
    </>
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
