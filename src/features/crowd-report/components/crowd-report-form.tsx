"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import ErrorOutlineRounded from "@mui/icons-material/ErrorOutlineRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import WhereToVoteOutlined from "@mui/icons-material/WhereToVoteOutlined";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { BuildingImage } from "@/features/locations/components/building-card";
import { decideSubmit, getCrowdReportView } from "../crowd-report";
import type {
  CrowdLevel,
  CrowdReportContext,
  CrowdReportSubmission,
  CrowdReportSubmitHandler,
} from "../types";
import { CrowdLevelPicker } from "./crowd-level-picker";
import { CrowdReportSuccessDialog } from "./crowd-report-success-dialog";

export interface CrowdReportFormProps {
  context: CrowdReportContext;
  submission: CrowdReportSubmission;
  onSubmit: CrowdReportSubmitHandler;
  onDone: () => void;
  onViewHistory?: () => void;
  initialLevel?: CrowdLevel | null;
}

export function CrowdReportForm({
  context,
  submission,
  onSubmit,
  onDone,
  onViewHistory,
  initialLevel = null,
}: CrowdReportFormProps) {
  const [level, setLevel] = useState<CrowdLevel | null>(initialLevel);
  const [showValidation, setShowValidation] = useState(false);
  const submitLockRef = useRef(false);
  const levelInputRef = useRef<HTMLInputElement>(null);
  const validationId = useId();
  const view = getCrowdReportView(submission);
  const invalid = showValidation && level === null;

  useEffect(() => {
    submitLockRef.current = false;
  }, [submission]);

  function handleLevelChange(next: CrowdLevel) {
    setLevel(next);
    setShowValidation(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLockRef.current) {
      return;
    }
    const decision = decideSubmit(level, submission);
    if (decision.type === "blocked") {
      return;
    }
    if (decision.type === "invalid") {
      setShowValidation(true);
      levelInputRef.current?.focus();
      return;
    }
    submitLockRef.current = true;
    onSubmit(decision.level);
  }

  return (
    <>
      <main className="flex min-w-0 flex-1 flex-col px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-[calc(7.625rem+env(safe-area-inset-bottom,0px))] text-black min-[400px]:px-[22px]">
        <header className="flex gap-1.5 pl-1.5">
          <span
            aria-hidden="true"
            className="mt-1.5 h-[55px] w-2 shrink-0 rounded-full bg-[#ff5815]"
          />
          <div className="min-w-0">
            <h1 className="text-[clamp(2rem,8vw,2.375rem)] leading-[1.2] font-bold">
              เช็คอิน
            </h1>
            <p className="text-base leading-snug font-medium text-[#878787]">
              เลือกระดับความหนาแน่นของชั้นที่คุณอยู่
            </p>
          </div>
        </header>

        <section
          aria-label="สถานที่ที่กำลังเช็คอิน"
          className="mt-3 flex flex-col gap-3 px-1.5"
        >
          <BuildingImage
            imageUrl={context.imageUrl}
            sizes="(max-width: 476px) 100vw, 432px"
            fallbackSize={64}
            className="aspect-[428/300] w-full border border-[#d9d9d9] !bg-[#f7f7f7]"
          />
          <dl className="flex min-h-[50px] flex-col items-center justify-center rounded-full bg-[#ea580c] px-5 py-2 text-center text-white">
            <dt className="sr-only">อาคาร</dt>
            <dd className="text-[clamp(1.0625rem,5vw,1.25rem)] leading-snug font-bold break-words">
              {context.buildingName}
            </dd>
            <dt className="sr-only">ชั้น</dt>
            <dd className="text-sm leading-5 font-medium text-white/90">
              {context.floorLabel}
            </dd>
          </dl>
        </section>

        <form
          noValidate
          onSubmit={handleSubmit}
          aria-busy={view.pending || undefined}
          className="mt-6 flex flex-col gap-4 px-1.5"
        >
          <CrowdLevelPicker
            value={level}
            onChange={handleLevelChange}
            disabled={view.locked}
            invalid={invalid}
            errorId={validationId}
            focusRef={levelInputRef}
          />

          {invalid && (
            <p
              id={validationId}
              role="alert"
              className="-mt-2 text-center text-sm leading-5 text-[#b3261e]"
            >
              กรุณาเลือกระดับความหนาแน่นก่อนเช็คอิน
            </p>
          )}

          {view.error && (
            <div
              role="alert"
              className="flex gap-2.5 rounded-2xl bg-[#ffecec] px-4 py-3 text-[#b3261e]"
            >
              <ErrorOutlineRounded
                aria-hidden="true"
                sx={{ fontSize: 22 }}
                className="mt-0.5 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-[15px] leading-6 font-semibold">
                  {view.error.title}
                </p>
                <p className="text-sm leading-5">{view.error.description}</p>
              </div>
            </div>
          )}

          <span role="status" className="sr-only">
            {view.pending ? "กำลังส่งข้อมูลความหนาแน่น" : ""}
          </span>

          <button
            type="submit"
            aria-disabled={!view.canSubmit || undefined}
            className="mx-auto flex h-[58px] w-full max-w-[358px] cursor-pointer touch-manipulation items-center justify-center gap-2.5 rounded-[14px] border-0 bg-[#ea580c] px-4 text-lg font-semibold text-white transition-colors duration-150 [-webkit-tap-highlight-color:transparent] hover:bg-[#d24f0b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#081828] active:bg-[#bb460a] aria-disabled:cursor-not-allowed aria-disabled:bg-[#f0a27f] aria-disabled:hover:bg-[#f0a27f]"
          >
            {view.pending ? (
              <CircularProgress
                aria-hidden="true"
                size={20}
                thickness={5}
                sx={{ color: "white" }}
              />
            ) : view.error?.canRetry ? (
              <RefreshRounded aria-hidden="true" sx={{ fontSize: 24 }} />
            ) : (
              <WhereToVoteOutlined aria-hidden="true" sx={{ fontSize: 24 }} />
            )}
            {view.submitLabel}
          </button>
        </form>
      </main>
      <BottomNavigation selected="scan" />
      <CrowdReportSuccessDialog
        record={submission.status === "success" ? submission.record : null}
        onDone={onDone}
        onViewHistory={onViewHistory}
      />
    </>
  );
}
