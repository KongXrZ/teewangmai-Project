import type { GpsEvidence } from "./location";

export type CrowdLevel = 1 | 2 | 3 | 4 | 5;

export interface CrowdReportContext {
  buildingName: string;
  floorLabel: string;
  imageUrl: string | null;
}

export type CrowdReportErrorReason =
  | "gps_denied"
  | "gps_unavailable"
  | "out_of_range"
  | "invalid_qr"
  | "cooldown"
  | "auth"
  | "network";

export interface CrowdReportRecord {
  buildingName: string;
  floorLabel: string;
  level: CrowdLevel;
  recordedAt: string;
}

export type CrowdReportSubmission =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "success"; record: CrowdReportRecord }
  | { status: "error"; reason: CrowdReportErrorReason; message?: string };

export type CrowdReportSubmitHandler = (level: CrowdLevel) => void;

export type CrowdLevelConfirmHandler = (level: CrowdLevel) => void;

export interface ResolvedFloor {
  floorRef: string;
  context: CrowdReportContext;
}

export type QrResolveFailure = Extract<
  CrowdReportErrorReason,
  "invalid_qr" | "auth" | "network"
>;

export type QrResolveResult =
  | { kind: "resolved"; floor: ResolvedFloor }
  | { kind: "rejected"; reason: QrResolveFailure; message?: string };

export interface CheckInSubmitInput {
  floorRef: string;
  level: CrowdLevel;
  gps: GpsEvidence;
}

export type CheckInSubmitResult =
  | { kind: "recorded"; record: CrowdReportRecord }
  | { kind: "rejected"; reason: CrowdReportErrorReason; message?: string };

export interface CheckInGateway {
  resolveQr: (rawValue: string, signal: AbortSignal) => Promise<QrResolveResult>;
  submitCheckIn: (
    input: CheckInSubmitInput,
    signal: AbortSignal,
  ) => Promise<CheckInSubmitResult>;
}
