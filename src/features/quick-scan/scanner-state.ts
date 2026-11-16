export type CameraStatus =
  | "idle"
  | "requesting"
  | "starting"
  | "scanning"
  | "detected"
  | "denied"
  | "unavailable"
  | "unsupported"
  | "error";

export type CameraFailure = Extract<
  CameraStatus,
  "denied" | "unavailable" | "unsupported" | "error"
>;

const deniedErrors = new Set([
  "NotAllowedError",
  "PermissionDeniedError",
  "SecurityError",
]);
const unavailableErrors = new Set([
  "NotFoundError",
  "DevicesNotFoundError",
  "OverconstrainedError",
  "ConstraintNotSatisfiedError",
]);

export function classifyCameraError(error: unknown): CameraFailure {
  const name =
    typeof error === "object" && error !== null && "name" in error
      ? String((error as { name: unknown }).name)
      : "";

  if (deniedErrors.has(name)) return "denied";
  if (unavailableErrors.has(name)) return "unavailable";
  if (name === "NotSupportedError") return "unsupported";
  return "error";
}

export interface ScannerView {
  showPreview: boolean;
  busy: boolean;
  canRetry: boolean;
  tone: "neutral" | "error";
  title: string;
  description: string;
}

export function getScannerView(status: CameraStatus): ScannerView {
  switch (status) {
    case "idle":
    case "requesting":
      return {
        showPreview: false,
        busy: true,
        canRetry: false,
        tone: "neutral",
        title: "กำลังขอสิทธิ์ใช้กล้อง",
        description: "โปรดอนุญาตให้เข้าถึงกล้องเพื่อสแกน QR Code",
      };
    case "starting":
      return {
        showPreview: true,
        busy: true,
        canRetry: false,
        tone: "neutral",
        title: "กำลังเปิดกล้อง",
        description: "รอสักครู่",
      };
    case "scanning":
      return {
        showPreview: true,
        busy: false,
        canRetry: false,
        tone: "neutral",
        title: "กำลังสแกน QR Code",
        description: "กรุณาวาง QR Code ให้อยู่ภายในกรอบ",
      };
    case "detected":
      return {
        showPreview: true,
        busy: false,
        canRetry: false,
        tone: "neutral",
        title: "อ่าน QR Code แล้ว",
        description: "กำลังตรวจสอบ QR Code",
      };
    case "denied":
      return {
        showPreview: false,
        busy: false,
        canRetry: true,
        tone: "error",
        title: "ไม่ได้รับสิทธิ์ใช้กล้อง",
        description:
          "โปรดอนุญาตการเข้าถึงกล้องในการตั้งค่าเบราว์เซอร์ แล้วลองอีกครั้ง",
      };
    case "unavailable":
      return {
        showPreview: false,
        busy: false,
        canRetry: true,
        tone: "error",
        title: "ไม่พบกล้อง",
        description: "อุปกรณ์นี้ไม่มีกล้องที่ใช้งานได้ หรือกล้องถูกปิดอยู่",
      };
    case "unsupported":
      return {
        showPreview: false,
        busy: false,
        canRetry: false,
        tone: "error",
        title: "เบราว์เซอร์ไม่รองรับกล้อง",
        description:
          "โปรดเปิดหน้านี้ผ่าน HTTPS ด้วยเบราว์เซอร์ที่รองรับการใช้กล้อง",
      };
    case "error":
      return {
        showPreview: false,
        busy: false,
        canRetry: true,
        tone: "error",
        title: "เปิดกล้องไม่สำเร็จ",
        description:
          "กล้องอาจถูกใช้งานโดยแอปอื่นอยู่ ปิดแอปนั้นแล้วลองอีกครั้ง",
      };
  }
}

export interface DetectionGate {
  accept: (rawValue: string) => boolean;
  reset: () => void;
  readonly settled: boolean;
}

export function createDetectionGate(): DetectionGate {
  let settled = false;

  return {
    accept(rawValue) {
      if (settled || rawValue.length === 0) return false;
      settled = true;
      return true;
    },
    reset() {
      settled = false;
    },
    get settled() {
      return settled;
    },
  };
}

export function stopMediaStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((track) => track.stop());
}
