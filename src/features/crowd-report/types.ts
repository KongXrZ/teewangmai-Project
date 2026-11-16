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
