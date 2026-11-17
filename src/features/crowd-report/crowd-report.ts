import type {
  CrowdLevel,
  CrowdReportErrorReason,
  CrowdReportSubmission,
} from "./types";

export interface CrowdLevelOption {
  value: CrowdLevel;
  label: string;
  caption?: string;
  colorClass: string;
}

export const crowdLevels: readonly CrowdLevelOption[] = [
  { value: 1, label: "ว่าง", caption: "ว่าง", colorClass: "bg-[#34c759]" },
  { value: 2, label: "ค่อนข้างว่าง", colorClass: "bg-[#b4e895]" },
  { value: 3, label: "ปานกลาง", colorClass: "bg-[#fffb00]" },
  { value: 4, label: "ค่อนข้างแน่น", colorClass: "bg-[#ff8d28]" },
  {
    value: 5,
    label: "แน่นมาก",
    caption: "แน่นมาก",
    colorClass: "bg-[#f50000]",
  },
];

export function getCrowdLevelLabel(level: CrowdLevel) {
  return crowdLevels.find((option) => option.value === level)?.label ?? "";
}

export function isCrowdLevel(value: unknown): value is CrowdLevel {
  return crowdLevels.some((option) => option.value === value);
}

export interface CrowdReportErrorCopy {
  title: string;
  description: string;
  canRetry: boolean;
}

const errorCopy: Record<CrowdReportErrorReason, CrowdReportErrorCopy> = {
  gps_denied: {
    title: "ไม่ได้รับสิทธิ์เข้าถึงตำแหน่ง",
    description:
      "โปรดอนุญาตการเข้าถึงตำแหน่งในการตั้งค่าเบราว์เซอร์ แล้วลองอีกครั้ง",
    canRetry: true,
  },
  gps_unavailable: {
    title: "ระบุตำแหน่งไม่ได้",
    description: "ไม่สามารถอ่านตำแหน่ง GPS ได้ในขณะนี้ โปรดลองอีกครั้ง",
    canRetry: true,
  },
  out_of_range: {
    title: "อยู่นอกพื้นที่อาคาร",
    description:
      "คุณต้องอยู่ใกล้อาคารนี้จึงจะเช็คอินได้ โปรดเข้าใกล้อาคารแล้วลองอีกครั้ง",
    canRetry: true,
  },
  invalid_qr: {
    title: "QR Code ไม่ถูกต้อง",
    description:
      "QR Code นี้ใช้ไม่ได้หรือหมดอายุแล้ว โปรดสแกน QR Code ประจำชั้นอีกครั้ง",
    canRetry: false,
  },
  cooldown: {
    title: "เพิ่งรายงานไปแล้ว",
    description:
      "คุณเพิ่งรายงานความหนาแน่นของชั้นนี้ โปรดรอสักครู่ก่อนรายงานอีกครั้ง",
    canRetry: false,
  },
  auth: {
    title: "กรุณาเข้าสู่ระบบอีกครั้ง",
    description: "เซสชันของคุณหมดอายุ โปรดเข้าสู่ระบบแล้วลองอีกครั้ง",
    canRetry: false,
  },
  network: {
    title: "ส่งข้อมูลไม่สำเร็จ",
    description: "การเชื่อมต่อมีปัญหา โปรดตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง",
    canRetry: true,
  },
};

export function getErrorCopy(reason: CrowdReportErrorReason) {
  return errorCopy[reason];
}

export interface CrowdReportView {
  pending: boolean;
  locked: boolean;
  canSubmit: boolean;
  submitLabel: string;
  error: CrowdReportErrorCopy | null;
}

export function getCrowdReportView(
  submission: CrowdReportSubmission,
  contextReady = true,
): CrowdReportView {
  const view = getSubmissionView(submission);
  if (contextReady) {
    return view;
  }
  return { ...view, canSubmit: false };
}

function getSubmissionView(submission: CrowdReportSubmission): CrowdReportView {
  switch (submission.status) {
    case "idle":
      return {
        pending: false,
        locked: false,
        canSubmit: true,
        submitLabel: "เช็คอินที่นี่",
        error: null,
      };
    case "pending":
      return {
        pending: true,
        locked: true,
        canSubmit: false,
        submitLabel: "กำลังส่ง…",
        error: null,
      };
    case "success":
      return {
        pending: false,
        locked: true,
        canSubmit: false,
        submitLabel: "เช็คอินที่นี่",
        error: null,
      };
    case "error": {
      const copy = getErrorCopy(submission.reason);
      return {
        pending: false,
        locked: false,
        canSubmit: copy.canRetry,
        submitLabel: copy.canRetry ? "ลองอีกครั้ง" : "เช็คอินที่นี่",
        error: {
          ...copy,
          description: submission.message || copy.description,
        },
      };
    }
  }
}

export type CrowdReportSubmitDecision =
  | { type: "submit"; level: CrowdLevel }
  | { type: "invalid" }
  | { type: "blocked" };

export function decideSubmit(
  level: CrowdLevel | null,
  submission: CrowdReportSubmission,
  contextReady = true,
): CrowdReportSubmitDecision {
  if (!getCrowdReportView(submission, contextReady).canSubmit) {
    return { type: "blocked" };
  }
  if (level === null) {
    return { type: "invalid" };
  }
  return { type: "submit", level };
}

export type CrowdReportStep = "select" | "scan" | "ready";

export function getCrowdReportStep(
  contextReady: boolean,
  levelConfirmed: boolean,
): CrowdReportStep {
  if (contextReady) {
    return "ready";
  }
  return levelConfirmed ? "scan" : "select";
}

export type CrowdLevelConfirmDecision =
  { type: "confirm"; level: CrowdLevel } | { type: "invalid" };

export function decideConfirmLevel(
  level: CrowdLevel | null,
): CrowdLevelConfirmDecision {
  if (level === null) {
    return { type: "invalid" };
  }
  return { type: "confirm", level };
}

const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Bangkok",
});

const timeFormatter = new Intl.DateTimeFormat("th-TH", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Asia/Bangkok",
});

export function formatRecordedAt(recordedAt: string) {
  const date = new Date(recordedAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return `วันที่ ${dateFormatter.format(date)} เวลา ${timeFormatter.format(date)} น.`;
}
