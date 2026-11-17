"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import ErrorOutlineRounded from "@mui/icons-material/ErrorOutlineRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import WhereToVoteOutlined from "@mui/icons-material/WhereToVoteOutlined";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { BuildingImage } from "@/features/locations/components/building-card";
import {
  decideConfirmLevel,
  decideSubmit,
  getCrowdReportStep,
  getCrowdReportView,
  type CrowdReportStep,
} from "../crowd-report";
import type {
  CrowdLevel,
  CrowdLevelConfirmHandler,
  CrowdReportContext,
  CrowdReportSubmission,
  CrowdReportSubmitHandler,
} from "../types";
import { CrowdLevelPicker } from "./crowd-level-picker";
import { CrowdReportSuccessDialog } from "./crowd-report-success-dialog";

export interface CrowdReportErrorAction {
  label: string;
  onAction: () => void;
}

export interface CrowdReportFormProps {
  context: CrowdReportContext | null;
  submission: CrowdReportSubmission;
  onConfirmLevel?: CrowdLevelConfirmHandler;
  onSubmit: CrowdReportSubmitHandler;
  onDone: () => void;
  onViewHistory?: () => void;
  initialLevel?: CrowdLevel | null;
  verifying?: boolean;
  errorAction?: CrowdReportErrorAction | null;
}

const primaryButton =
  "mx-auto flex h-[58px] w-full max-w-[358px] cursor-pointer touch-manipulation items-center justify-center gap-2.5 rounded-[14px] border-0 bg-[#ea580c] px-4 text-lg font-semibold text-white transition-colors duration-150 [-webkit-tap-highlight-color:transparent] hover:bg-[#d24f0b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#081828] active:bg-[#bb460a] aria-disabled:cursor-not-allowed aria-disabled:bg-[#f0a27f] aria-disabled:hover:bg-[#f0a27f]";

const placeholderBox =
  "flex aspect-[428/300] w-full items-center justify-center rounded-[10px] border border-[#d9d9d9] bg-[#f7f7f7] px-6 text-center text-[13px] leading-5 text-[#878787]";

export function CrowdReportForm({
  context,
  submission,
  onConfirmLevel,
  onSubmit,
  onDone,
  onViewHistory,
  initialLevel = null,
  verifying = false,
  errorAction = null,
}: CrowdReportFormProps) {
  const [level, setLevel] = useState<CrowdLevel | null>(initialLevel);
  const [levelConfirmed, setLevelConfirmed] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const submitLockRef = useRef(false);
  const levelInputRef = useRef<HTMLInputElement>(null);
  const validationId = useId();
  const contextReady = context !== null;
  const step = getCrowdReportStep(contextReady, levelConfirmed);
  const view = getCrowdReportView(submission, contextReady);
  const invalid = showValidation && level === null;
  const exitAction =
    step === "ready" && view.error && !view.canSubmit ? errorAction : null;

  useEffect(() => {
    submitLockRef.current = false;
  }, [submission]);

  function handleLevelChange(next: CrowdLevel) {
    setLevel(next);
    setShowValidation(false);
  }

  function showLevelRequired() {
    setShowValidation(true);
    levelInputRef.current?.focus();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === "scan") {
      return;
    }
    if (step === "select") {
      const decision = decideConfirmLevel(level);
      if (decision.type === "invalid") {
        showLevelRequired();
        return;
      }
      setLevelConfirmed(true);
      onConfirmLevel?.(decision.level);
      return;
    }
    if (submitLockRef.current) {
      return;
    }
    const decision = decideSubmit(level, submission, contextReady);
    if (decision.type === "blocked") {
      return;
    }
    if (decision.type === "invalid") {
      showLevelRequired();
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
          aria-busy={(!contextReady && verifying) || undefined}
          className="mt-3 flex flex-col gap-3 px-1.5"
        >
          <StepVisual step={step} context={context} />
          {context ? (
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
          ) : verifying ? (
            <p
              role="status"
              className="flex min-h-[50px] items-center justify-center gap-2.5 rounded-full bg-[#ff8a5c] px-5 py-2 text-[clamp(1.0625rem,5vw,1.25rem)] leading-snug font-bold text-white"
            >
              <CircularProgress
                aria-hidden="true"
                size={20}
                thickness={5}
                sx={{ color: "white" }}
              />
              กำลังตรวจสอบ
            </p>
          ) : null}
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
              กรุณาเลือกระดับความหนาแน่น
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

          {step === "select" && (
            <button type="submit" className={primaryButton}>
              ยืนยันความหนาแน่น
            </button>
          )}

          {exitAction && (
            <button
              type="button"
              onClick={exitAction.onAction}
              className={primaryButton}
            >
              {exitAction.label}
            </button>
          )}

          {step === "ready" && !exitAction && (
            <button
              type="submit"
              aria-disabled={!view.canSubmit || undefined}
              className={primaryButton}
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
          )}
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

function StepVisual({
  step,
  context,
}: {
  step: CrowdReportStep;
  context: CrowdReportContext | null;
}) {
  if (step === "ready") {
    return (
      <BuildingImage
        imageUrl={context?.imageUrl ?? null}
        sizes="(max-width: 476px) 100vw, 432px"
        fallbackSize={64}
        className="aspect-[428/300] w-full border border-[#d9d9d9] !bg-[#f7f7f7]"
      />
    );
  }
  return (
    <p className={placeholderBox}>
      {step === "scan"
        ? "กรุณาสแกน QR Code ประจำชั้น"
        : "กรุณาเลือกความหนาแน่นก่อนสแกน"}
    </p>
  );
}
