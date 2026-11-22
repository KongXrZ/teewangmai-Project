export const DEFAULT_DELETE_AVATAR_ERROR = "ลบรูปโปรไฟล์ไม่สำเร็จ โปรดลองใหม่อีกครั้ง";
export const UNAUTHORIZED_DELETE_AVATAR_ERROR = "กรุณาเข้าสู่ระบบก่อนทำรายการ";

export type DeleteAvatarApiResult =
  | { kind: "ok" }
  | { kind: "unauthorized"; message: string }
  | { kind: "error"; message: string }
  | { kind: "aborted" };

export type AvatarDeleteAction =
  | { visible: false; mode: "none" }
  | { visible: true; mode: "clear-draft" }
  | { visible: true; mode: "delete-saved" }
  | { visible: true; mode: "delete-saved-and-draft" };

export function getAvatarDeleteAction(state: {
  savedAvatarUrl: string | null;
  hasLocalFile: boolean;
}): AvatarDeleteAction {
  const hasSaved = Boolean(state.savedAvatarUrl);
  if (!hasSaved && !state.hasLocalFile) {
    return { visible: false, mode: "none" };
  }
  if (!hasSaved && state.hasLocalFile) {
    return { visible: true, mode: "clear-draft" };
  }
  if (hasSaved && state.hasLocalFile) {
    return { visible: true, mode: "delete-saved-and-draft" };
  }
  return { visible: true, mode: "delete-saved" };
}

function readErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const error = (body as { error?: unknown }).error;
  if (typeof error !== "string") return null;
  const trimmed = error.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseDeleteAvatarResponse(
  status: number,
  body: unknown,
): Exclude<DeleteAvatarApiResult, { kind: "aborted" }> {
  if (status === 401) {
    return {
      kind: "unauthorized",
      message: readErrorMessage(body) ?? UNAUTHORIZED_DELETE_AVATAR_ERROR,
    };
  }

  if (status >= 200 && status < 300) {
    if (
      body &&
      typeof body === "object" &&
      (body as { success?: unknown }).success === true &&
      (body as { data?: unknown }).data &&
      typeof (body as { data?: unknown }).data === "object" &&
      ((body as { data: { avatar_url?: unknown } }).data.avatar_url === null)
    ) {
      return { kind: "ok" };
    }
    return { kind: "error", message: DEFAULT_DELETE_AVATAR_ERROR };
  }

  if (status === 400) {
    return {
      kind: "error",
      message: readErrorMessage(body) ?? DEFAULT_DELETE_AVATAR_ERROR,
    };
  }

  return { kind: "error", message: DEFAULT_DELETE_AVATAR_ERROR };
}

function isAbortError(error: unknown, signal?: AbortSignal) {
  if (signal?.aborted) return true;
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

export async function requestDeleteProfileAvatar(
  options: { signal?: AbortSignal; fetchImpl?: typeof fetch } = {},
): Promise<DeleteAvatarApiResult> {
  const fetchFn = options.fetchImpl ?? fetch;
  try {
    const response = await fetchFn("/api/profile/avatar", {
      method: "DELETE",
      credentials: "same-origin",
      cache: "no-store",
      signal: options.signal,
    });
    const body = await response.json().catch(() => null);
    return parseDeleteAvatarResponse(response.status, body);
  } catch (error) {
    if (isAbortError(error, options.signal)) {
      return { kind: "aborted" };
    }
    return { kind: "error", message: DEFAULT_DELETE_AVATAR_ERROR };
  }
}
