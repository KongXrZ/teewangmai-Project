const STORAGE_PREFIX = "teewangmai:attempt:";

const memoryKeys = new Map<string, string>();

function createUuid(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10).join(""),
  ].join("-");
}

function readStored(scope: string): string | null {
  try {
    return sessionStorage.getItem(STORAGE_PREFIX + scope);
  } catch {
    return null;
  }
}

export function readAttemptKey(scope: string): string | null {
  return readStored(scope) ?? memoryKeys.get(scope) ?? null;
}

export function getAttemptKey(scope: string): string {
  const existing = readAttemptKey(scope);
  if (existing) {
    return existing;
  }
  const key = createUuid();
  memoryKeys.set(scope, key);
  try {
    sessionStorage.setItem(STORAGE_PREFIX + scope, key);
  } catch {
    return key;
  }
  return key;
}

export function clearAttemptKey(scope: string): void {
  memoryKeys.delete(scope);
  try {
    sessionStorage.removeItem(STORAGE_PREFIX + scope);
  } catch {
    return;
  }
}

export const redeemAttemptScope = (rewardId: number) => `redeem:${rewardId}`;

export const voucherUseAttemptScope = (voucherId: number) =>
  `voucher-use:${voucherId}`;
