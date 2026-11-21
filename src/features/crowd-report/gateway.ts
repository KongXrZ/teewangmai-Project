import { z } from "zod";
import { parseFloorQrPayload } from "../quick-scan/floor-qr-payload.ts";
import type {
  CheckInGateway,
  CheckInSubmitInput,
  CheckInSubmitResult,
  CrowdLevel,
  CrowdReportErrorReason,
  QrResolveResult,
} from "./types";

const notReadyMessage = "ระบบเช็คอินยังไม่พร้อมใช้งาน โปรดลองใหม่ภายหลัง";
const invalidQrMessage = "QR Code นี้ไม่ใช่ของชั้นที่เปิดให้เช็คอิน";

export const unavailableCheckInGateway: CheckInGateway = {
  resolveQr: async () => ({
    kind: "rejected",
    reason: "network",
    message: notReadyMessage,
  }),
  submitCheckIn: async () => ({
    kind: "rejected",
    reason: "network",
    message: notReadyMessage,
  }),
};

const resolveResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    floor_ref: z.string().min(1),
    location: z.object({
      id: z.number().int().positive(),
      building: z.string().min(1),
      name: z.string().min(1),
      image_url: z.string().nullable(),
    }),
    floor: z.object({
      id: z.number().int().positive(),
      name: z.string().min(1),
    }),
  }),
});

const submitResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.number().int().positive(),
    location: z.object({
      id: z.number().int().positive(),
      building: z.string().min(1),
      name: z.string().min(1),
    }),
    floor: z.object({
      id: z.number().int().positive(),
      name: z.string().min(1),
    }),
    crowd_level: z.number().int().min(1).max(5),
    created_at: z.string().min(1),
    next_eligible_at: z.string().min(1).optional(),
  }),
});

const timeFormatter = new Intl.DateTimeFormat("th-TH", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Asia/Bangkok",
});

export function formatFloorLabel(floorName: string): string {
  const trimmed = floorName.trim();
  return trimmed.startsWith("ชั้น") ? trimmed : `ชั้น ${trimmed}`;
}

function formatCooldownMessage(
  nextEligibleAt: unknown,
  fallback?: string,
): string | undefined {
  if (typeof nextEligibleAt === "string") {
    const date = new Date(nextEligibleAt);
    if (!Number.isNaN(date.getTime())) {
      return `รายงานชั้นนี้ไปแล้ว โปรดรอถึง ${timeFormatter.format(date)} น. ก่อนรายงานอีกครั้ง`;
    }
  }
  return fallback;
}

function formatOutOfRangeMessage(
  distanceMeters: unknown,
  fallback?: string,
): string | undefined {
  if (typeof distanceMeters === "number" && Number.isFinite(distanceMeters)) {
    return `ตำแหน่งของคุณอยู่ห่างจากอาคารประมาณ ${Math.round(distanceMeters)} เมตร โปรดเข้าใกล้อาคารแล้วลองอีกครั้ง`;
  }
  return fallback;
}

function readStringField(body: unknown, field: string): string | undefined {
  if (typeof body !== "object" || body === null || !(field in body)) {
    return undefined;
  }
  const value = (body as Record<string, unknown>)[field];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readField(body: unknown, field: string): unknown {
  if (typeof body !== "object" || body === null || !(field in body)) {
    return undefined;
  }
  return (body as Record<string, unknown>)[field];
}

function isAbortError(error: unknown, signal?: AbortSignal): boolean {
  return (
    Boolean(signal?.aborted) ||
    (error instanceof Error && error.name === "AbortError")
  );
}

export function parseResolveQrResponse(
  status: number,
  body: unknown,
): QrResolveResult {
  const code = readStringField(body, "code");
  const message = readStringField(body, "error");

  if (status === 401 || code === "unauthorized") {
    return { kind: "rejected", reason: "auth", message };
  }
  if (code === "invalid_qr" || status === 404) {
    return { kind: "rejected", reason: "invalid_qr", message };
  }
  if (status >= 200 && status < 300) {
    const parsed = resolveResponseSchema.safeParse(body);
    if (!parsed.success) {
      return { kind: "rejected", reason: "network" };
    }
    const { floor_ref, location, floor } = parsed.data.data;
    return {
      kind: "resolved",
      floor: {
        floorRef: floor_ref,
        context: {
          buildingName: location.name,
          floorLabel: formatFloorLabel(floor.name),
          imageUrl: location.image_url,
        },
      },
    };
  }
  return { kind: "rejected", reason: "network", message };
}

export function parseSubmitCheckInResponse(
  status: number,
  body: unknown,
): CheckInSubmitResult {
  const code = readStringField(body, "code");
  const message = readStringField(body, "error");

  if (status === 401 || code === "unauthorized") {
    return { kind: "rejected", reason: "auth", message };
  }
  if (code === "invalid_qr" || status === 404) {
    return { kind: "rejected", reason: "invalid_qr", message };
  }
  if (code === "cooldown") {
    return {
      kind: "rejected",
      reason: "cooldown",
      message: formatCooldownMessage(
        readField(body, "next_eligible_at"),
        message,
      ),
    };
  }
  if (code === "out_of_range") {
    return {
      kind: "rejected",
      reason: "out_of_range",
      message: formatOutOfRangeMessage(
        readField(body, "distance_meters"),
        message,
      ),
    };
  }
  if (code === "gps_inaccurate") {
    return {
      kind: "rejected",
      reason: "gps_unavailable",
      message,
    };
  }
  if (status >= 200 && status < 300) {
    const parsed = submitResponseSchema.safeParse(body);
    if (!parsed.success) {
      return { kind: "rejected", reason: "network" };
    }
    const { location, floor, crowd_level, created_at } = parsed.data.data;
    return {
      kind: "recorded",
      record: {
        buildingName: location.name,
        floorLabel: formatFloorLabel(floor.name),
        level: crowd_level as CrowdLevel,
        recordedAt: created_at,
      },
    };
  }
  return {
    kind: "rejected",
    reason: "network" as CrowdReportErrorReason,
    message,
  };
}

export function createCheckInGateway(
  fetchImpl: typeof fetch = fetch,
): CheckInGateway {
  return {
    async resolveQr(
      rawValue: string,
      signal: AbortSignal,
    ): Promise<QrResolveResult> {
      const qr = parseFloorQrPayload(rawValue);
      if (!qr) {
        return {
          kind: "rejected",
          reason: "invalid_qr",
          message: invalidQrMessage,
        };
      }

      try {
        const response = await fetchImpl("/api/checkins/resolve", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify({ qr }),
          signal,
        });
        const body = (await response.json().catch(() => null)) as unknown;
        if (signal.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }
        return parseResolveQrResponse(response.status, body);
      } catch (error) {
        if (isAbortError(error, signal)) {
          throw error;
        }
        return { kind: "rejected", reason: "network" };
      }
    },

    async submitCheckIn(
      input: CheckInSubmitInput,
      signal: AbortSignal,
    ): Promise<CheckInSubmitResult> {
      try {
        const response = await fetchImpl("/api/checkins", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify({
            qr: input.floorRef,
            crowd_level: input.level,
            latitude: input.gps.latitude,
            longitude: input.gps.longitude,
            accuracy_meters: input.gps.accuracyMeters,
          }),
          signal,
        });
        const body = (await response.json().catch(() => null)) as unknown;
        if (signal.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }
        return parseSubmitCheckInResponse(response.status, body);
      } catch (error) {
        if (isAbortError(error, signal)) {
          throw error;
        }
        return { kind: "rejected", reason: "network" };
      }
    },
  };
}

export const httpCheckInGateway = createCheckInGateway();
