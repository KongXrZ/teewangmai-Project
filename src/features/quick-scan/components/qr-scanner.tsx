"use client";

import { useEffect, useId, type ReactNode } from "react";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import ErrorOutlineRounded from "@mui/icons-material/ErrorOutlineRounded";
import NoPhotographyOutlined from "@mui/icons-material/NoPhotographyOutlined";
import QrCodeScannerRounded from "@mui/icons-material/QrCodeScannerRounded";
import VideocamOffOutlined from "@mui/icons-material/VideocamOffOutlined";
import { useCameraScanner, type ScanRound } from "../hooks/use-camera-scanner";
import { getScannerView, type CameraStatus } from "../scanner-state";
import { Spinner } from "./spinner";

export interface QrScannerProps {
  onDetect?: (rawValue: string) => void;
  round?: ScanRound;
  verifying?: boolean;
  onStatusChange?: (status: CameraStatus) => void;
}

export function QrScanner({
  onDetect,
  round,
  verifying = false,
  onStatusChange,
}: QrScannerProps) {
  const headingId = useId();
  const { videoRef, status, retry } = useCameraScanner({ onDetect, round });

  useEffect(() => {
    onStatusChange?.(status);
  }, [onStatusChange, status]);
  const view = getScannerView(status);
  const description =
    status === "detected" && !verifying ? "รอผลการตรวจสอบ" : view.description;

  return (
    <section
      aria-labelledby={headingId}
      aria-busy={view.busy || undefined}
      className="rounded-2xl bg-white p-2.5 shadow-[0_1px_4px_rgb(0_0_0/8%)]"
    >
      <header className="flex items-center gap-2 px-1 pt-0.5 pb-2.5">
        <QrCodeScannerRounded
          aria-hidden="true"
          sx={{ fontSize: 34 }}
          className="shrink-0 text-[#ff5815]"
        />
        <div
          className="min-w-0"
          role={view.tone === "error" ? "alert" : "status"}
        >
          <h2
            id={headingId}
            className="text-lg leading-tight font-bold text-black"
          >
            {view.title}
          </h2>
          <p className="text-[13px] leading-snug text-[#5c5c5c]">
            {description}
          </p>
        </div>
      </header>

      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl bg-[#f4f4f4]">
        <video
          ref={videoRef}
          aria-label="ภาพจากกล้องสำหรับสแกน QR Code"
          autoPlay
          muted
          playsInline
          disablePictureInPicture
          className={`absolute inset-0 h-full w-full bg-black object-cover ${
            view.showPreview ? "" : "hidden"
          }`}
        />

        {view.showPreview ? (
          <ScanOverlay status={status} verifying={verifying} />
        ) : (
          <ScannerMessage
            status={status}
            canRetry={view.canRetry}
            onRetry={retry}
          />
        )}
      </div>
    </section>
  );
}

function ScanOverlay({
  status,
  verifying,
}: {
  status: CameraStatus;
  verifying: boolean;
}) {
  const scanning = status === "scanning";

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="absolute top-1/2 left-1/2 aspect-square h-[78%] -translate-x-1/2 -translate-y-1/2">
        <Corner className="top-0 left-0 rounded-tl-2xl border-t-4 border-l-4" />
        <Corner className="top-0 right-0 rounded-tr-2xl border-t-4 border-r-4" />
        <Corner className="bottom-0 left-0 rounded-bl-2xl border-b-4 border-l-4" />
        <Corner className="right-0 bottom-0 rounded-br-2xl border-r-4 border-b-4" />
        {scanning && (
          <span className="absolute inset-x-[-8%] top-1/2 h-0.5 bg-[linear-gradient(90deg,transparent,#ff5815_20%,#ffb08a_50%,#ff5815_80%,transparent)] shadow-[0_0_10px_2px_rgb(255_88_21/55%)] motion-safe:animate-[qr-scan-line_2.4s_ease-in-out_infinite]" />
        )}
      </div>

      {status === "starting" && (
        <OverlayChip icon={<Spinner />} label="กำลังเปิดกล้อง..." />
      )}
      {status === "detected" &&
        (verifying ? (
          <OverlayChip icon={<Spinner />} label="กำลังตรวจสอบ..." />
        ) : (
          <OverlayChip
            icon={
              <CheckCircleRounded
                sx={{ fontSize: 16 }}
                className="text-[#7be08f]"
              />
            }
            label="อ่าน QR Code แล้ว"
          />
        ))}
    </div>
  );
}

function Corner({ className }: { className: string }) {
  return (
    <span
      className={`absolute h-[22%] w-[22%] border-[#ff7a3d] ${className}`}
    />
  );
}

function OverlayChip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-[rgb(40_40_40/72%)] px-3.5 py-1.5 text-xs whitespace-nowrap text-white">
      {icon}
      {label}
    </span>
  );
}

function ScannerMessage({
  status,
  canRetry,
  onRetry,
}: {
  status: CameraStatus;
  canRetry: boolean;
  onRetry: () => void;
}) {
  const icon =
    status === "denied" ? (
      <NoPhotographyOutlined sx={{ fontSize: 36 }} />
    ) : status === "unavailable" || status === "unsupported" ? (
      <VideocamOffOutlined sx={{ fontSize: 36 }} />
    ) : status === "error" ? (
      <ErrorOutlineRounded sx={{ fontSize: 36 }} />
    ) : (
      <Spinner className="h-7 w-7 border-[3px] border-[#ff5815]/25 border-t-[#ff5815]" />
    );

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 p-4 text-center text-[#878787]">
      <span aria-hidden="true" className="flex">
        {icon}
      </span>
      {canRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-11 cursor-pointer touch-manipulation rounded-full border-0 bg-[#ff5815] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#e04a0c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#081828] active:bg-[#c9410a]"
        >
          ลองอีกครั้ง
        </button>
      )}
    </div>
  );
}
