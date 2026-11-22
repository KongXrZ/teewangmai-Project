export const FLOOR_QR_PAYLOAD_FORMAT = "floor-uuid-v1";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseFloorQrPayload(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const identifier = value.trim();
  return uuid.test(identifier) ? identifier : null;
}
