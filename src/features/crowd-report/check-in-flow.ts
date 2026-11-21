import type { GpsFailure } from "./location";
import type {
  CheckInSubmitResult,
  CrowdLevel,
  CrowdReportErrorReason,
  CrowdReportSubmission,
  QrResolveFailure,
  QrResolveResult,
  ResolvedFloor,
} from "./types";

export type CheckInPhase = "select" | "scan" | "ready";

export type CheckInScanState =
  | { status: "idle" }
  | { status: "verifying" }
  | { status: "rejected"; reason: QrResolveFailure; message?: string };

export interface CheckInFlowState {
  phase: CheckInPhase;
  level: CrowdLevel | null;
  scan: CheckInScanState;
  floor: ResolvedFloor | null;
  submission: CrowdReportSubmission;
  formKey: number;
}

export type CheckInFlowAction =
  | { type: "confirm_level"; level: CrowdLevel }
  | { type: "set_level"; level: CrowdLevel }
  | { type: "resolve_start" }
  | { type: "resolve_done"; result: QrResolveResult }
  | { type: "rescan" }
  | { type: "back_to_select" }
  | { type: "scan_again" }
  | { type: "submit_start" }
  | { type: "gps_failed"; reason: GpsFailure }
  | { type: "submit_done"; result: CheckInSubmitResult }
  | { type: "reset" };

export const initialCheckInFlowState: CheckInFlowState = {
  phase: "select",
  level: null,
  scan: { status: "idle" },
  floor: null,
  submission: { status: "idle" },
  formKey: 0,
};

export function gpsFailureReason(failure: GpsFailure): CrowdReportErrorReason {
  return failure === "denied" ? "gps_denied" : "gps_unavailable";
}

export type CheckInErrorExit = "rescan" | "login" | "restart";

export function getErrorExit(
  submission: CrowdReportSubmission,
): CheckInErrorExit | null {
  if (submission.status !== "error") return null;
  switch (submission.reason) {
    case "invalid_qr":
      return "rescan";
    case "auth":
      return "login";
    case "cooldown":
      return "restart";
    default:
      return null;
  }
}

export function canStartSubmit(state: CheckInFlowState) {
  return (
    state.phase === "ready" &&
    state.floor !== null &&
    state.level !== null &&
    (state.submission.status === "idle" || state.submission.status === "error")
  );
}

export function checkInFlowReducer(
  state: CheckInFlowState,
  action: CheckInFlowAction,
): CheckInFlowState {
  switch (action.type) {
    case "confirm_level":
      if (state.phase !== "select") return state;
      return {
        ...state,
        phase: "scan",
        level: action.level,
        scan: { status: "idle" },
      };
    case "set_level":
      if (state.phase === "select" || state.submission.status === "pending") {
        return state;
      }
      return { ...state, level: action.level };
    case "resolve_start":
      if (state.phase !== "scan" || state.scan.status === "verifying") {
        return state;
      }
      return { ...state, scan: { status: "verifying" } };
    case "resolve_done":
      if (state.phase !== "scan" || state.scan.status !== "verifying") {
        return state;
      }
      if (action.result.kind === "rejected") {
        return {
          ...state,
          scan: {
            status: "rejected",
            reason: action.result.reason,
            message: action.result.message,
          },
        };
      }
      return {
        ...state,
        phase: "ready",
        scan: { status: "idle" },
        floor: action.result.floor,
        submission: { status: "idle" },
        formKey: state.formKey + 1,
      };
    case "rescan":
      if (state.phase !== "scan" || state.scan.status === "verifying") {
        return state;
      }
      return { ...state, scan: { status: "idle" } };
    case "back_to_select":
      if (state.phase !== "scan") return state;
      return {
        ...state,
        phase: "select",
        scan: { status: "idle" },
        floor: null,
        submission: { status: "idle" },
        formKey: state.formKey + 1,
      };
    case "scan_again":
      if (state.phase !== "ready" || state.submission.status !== "error") {
        return state;
      }
      return {
        ...state,
        phase: "scan",
        scan: { status: "idle" },
        floor: null,
        submission: { status: "idle" },
      };
    case "submit_start":
      if (!canStartSubmit(state)) return state;
      return { ...state, submission: { status: "pending" } };
    case "gps_failed":
      if (state.submission.status !== "pending") return state;
      return {
        ...state,
        submission: {
          status: "error",
          reason: gpsFailureReason(action.reason),
        },
      };
    case "submit_done":
      if (state.submission.status !== "pending") return state;
      if (action.result.kind === "rejected") {
        return {
          ...state,
          submission: {
            status: "error",
            reason: action.result.reason,
            message: action.result.message,
          },
        };
      }
      return {
        ...state,
        submission: { status: "success", record: action.result.record },
      };
    case "reset":
      return { ...initialCheckInFlowState, formKey: state.formKey + 1 };
  }
}
