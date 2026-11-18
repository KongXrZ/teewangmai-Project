export interface GpsEvidence {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  capturedAt: string;
}

export type GpsFailure = "denied" | "unavailable" | "timeout" | "inaccurate";

export type GpsResult =
  | { kind: "ok"; evidence: GpsEvidence }
  | { kind: "failed"; reason: GpsFailure };

export interface GpsOptions {
  timeoutMs: number;
  maxAccuracyMeters: number;
}

export const defaultGpsOptions: GpsOptions = {
  timeoutMs: 10_000,
  maxAccuracyMeters: 100,
};

interface PositionLike {
  coords: { latitude: number; longitude: number; accuracy: number };
  timestamp: number;
}

interface GeolocationLike {
  getCurrentPosition: (
    success: (position: PositionLike) => void,
    error: (error: { code: number }) => void,
    options?: PositionOptions,
  ) => void;
}

const PERMISSION_DENIED = 1;
const TIMEOUT = 3;

export function classifyGeolocationError(code: number): GpsFailure {
  if (code === PERMISSION_DENIED) return "denied";
  if (code === TIMEOUT) return "timeout";
  return "unavailable";
}

export function toGpsResult(
  position: PositionLike,
  maxAccuracyMeters: number,
): GpsResult {
  const { latitude, longitude, accuracy } = position.coords;
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(accuracy)
  ) {
    return { kind: "failed", reason: "unavailable" };
  }
  if (accuracy > maxAccuracyMeters) {
    return { kind: "failed", reason: "inaccurate" };
  }
  return {
    kind: "ok",
    evidence: {
      latitude,
      longitude,
      accuracyMeters: accuracy,
      capturedAt: new Date(position.timestamp).toISOString(),
    },
  };
}

function abortError() {
  return Object.assign(new Error("Aborted"), { name: "AbortError" });
}

export function requestGpsEvidence(
  signal: AbortSignal,
  options: GpsOptions = defaultGpsOptions,
  geolocation: GeolocationLike | undefined = typeof navigator === "undefined"
    ? undefined
    : navigator.geolocation,
): Promise<GpsResult> {
  if (signal.aborted) {
    return Promise.reject(abortError());
  }
  if (!geolocation) {
    return Promise.resolve({ kind: "failed", reason: "unavailable" });
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (settle: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      settle();
    };
    const onAbort = () => finish(() => reject(abortError()));
    const timer = setTimeout(
      () => finish(() => resolve({ kind: "failed", reason: "timeout" })),
      options.timeoutMs,
    );
    signal.addEventListener("abort", onAbort);

    try {
      geolocation.getCurrentPosition(
        (position) =>
          finish(() =>
            resolve(toGpsResult(position, options.maxAccuracyMeters)),
          ),
        (error) =>
          finish(() =>
            resolve({
              kind: "failed",
              reason: classifyGeolocationError(error.code),
            }),
          ),
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: options.timeoutMs,
        },
      );
    } catch {
      finish(() => resolve({ kind: "failed", reason: "unavailable" }));
    }
  });
}
