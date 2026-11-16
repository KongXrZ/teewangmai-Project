export type QuickScanVerification =
  | { status: "idle" }
  | { status: "verifying" }
  | { status: "resolved"; label: string }
  | { status: "rejected"; message?: string };

export type QrDetectHandler = (rawValue: string) => void;
