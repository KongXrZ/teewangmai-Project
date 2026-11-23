"use client";

import { useEffect, useId, useState } from "react";
import WhereToVoteOutlined from "@mui/icons-material/WhereToVoteOutlined";
import { useAuth } from "@/features/auth/components/auth-provider";
import { loadCheckinCooldowns } from "./checkin-cooldowns";
import type { FloorId } from "./location-view-models";

const cooldownTime = new Intl.DateTimeFormat("th-TH", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
  timeZone: "Asia/Bangkok",
});

type BuildingCheckInButtonProps = {
  floorId?: FloorId;
  onCheckIn?: () => void;
};

export function BuildingCheckInButton(props: BuildingCheckInButtonProps) {
  const { status, user } = useAuth();
  const userId = status === "authenticated" ? user?.id : undefined;

  return (
    <CheckInButton
      key={userId ?? status}
      {...props}
      userId={userId}
      authLoading={status === "loading"}
    />
  );
}

function CheckInButton({
  floorId,
  onCheckIn,
  userId,
  authLoading,
}: BuildingCheckInButtonProps & { userId?: string; authLoading: boolean }) {
  const hintId = useId();
  const [cooldowns, setCooldowns] = useState<Map<FloorId, number> | null>(null);
  const canCheckIn = Boolean(onCheckIn);

  useEffect(() => {
    if (!userId || !canCheckIn) return;

    let controller: AbortController | undefined;
    function refresh() {
      controller?.abort();
      const next = new AbortController();
      controller = next;
      loadCheckinCooldowns(next.signal)
        .then((result) => {
          if (next.signal.aborted) return;
          const now = Date.now();
          setCooldowns(new Map([...result].filter(([, deadline]) => deadline > now)));
        })
        .catch(() => {
          if (!next.signal.aborted) setCooldowns((current) => current ?? new Map());
        });
    }

    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    return () => {
      controller?.abort();
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, [userId, canCheckIn]);

  const nextExpiration = cooldowns?.size ? Math.min(...cooldowns.values()) : undefined;
  useEffect(() => {
    if (nextExpiration === undefined) return;
    const timer = window.setTimeout(() => {
      const now = Date.now();
      setCooldowns((current) =>
        current && new Map([...current].filter(([, deadline]) => deadline > now)),
      );
    }, Math.max(0, nextExpiration - Date.now()));
    return () => window.clearTimeout(timer);
  }, [nextExpiration]);

  const deadline = floorId ? cooldowns?.get(floorId) : undefined;
  const isChecking = Boolean(floorId && canCheckIn && (authLoading || (userId && !cooldowns)));
  const disabled = !floorId || !canCheckIn || isChecking || deadline !== undefined;

  return (
    <>
      <button
        type="button"
        onClick={onCheckIn}
        disabled={disabled}
        aria-describedby={deadline !== undefined ? hintId : undefined}
        className="flex h-[58px] w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border-0 bg-[#ff5815] font-[family-name:var(--font-noto-sans-thai)] text-lg font-semibold text-white transition-colors duration-150 enabled:hover:bg-[#e94e10] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff5815] disabled:cursor-not-allowed disabled:bg-[#e5e7eb] disabled:text-[#4b5563]"
      >
        <WhereToVoteOutlined aria-hidden="true" sx={{ fontSize: 26 }} />
        {isChecking ? "กำลังตรวจสถานะเช็กอิน…" : deadline !== undefined ? "เช็กอินชั้นนี้แล้ว" : "เช็คอินที่นี่"}
      </button>
      <p id={hintId} role="status" className={deadline === undefined ? "sr-only" : "text-center text-sm text-[#4b5563]"}>
        {deadline === undefined ? "" : `เช็กอินได้อีกครั้งเวลา ${cooldownTime.format(deadline)} น.`}
      </p>
    </>
  );
}
