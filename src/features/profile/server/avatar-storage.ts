import type { createClient } from "@/lib/supabase/server";
import {
  AVATAR_BUCKET,
  AVATAR_MAX_BYTES,
  avatarObjectPath,
  checkAvatar,
} from "../avatar.ts";
import { isLostSession } from "./checkin-history.ts";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

type AvatarStorageFile = {
  id?: string | null;
  name: string;
  created_at?: string | null;
};

type AvatarStorageBucket = {
  list: (
    path?: string,
    options?: { limit?: number },
  ) => PromiseLike<{ data: AvatarStorageFile[] | null; error: unknown }>;
  remove: (
    paths: string[],
  ) => PromiseLike<{ data?: unknown; error: unknown }>;
  upload?: (
    path: string,
    body: Uint8Array,
    options: { contentType: string; upsert: boolean },
  ) => PromiseLike<{ error: unknown }>;
  getPublicUrl?: (path: string) => { data: { publicUrl: string } };
};

export type AvatarStorageClient = {
  from: (bucket: string) => AvatarStorageBucket;
};

export type AvatarDeleteDeps = {
  getUser: () => PromiseLike<{
    data: { user: { id: string } | null };
    error: { name?: string; status?: number; code?: string } | null;
  }>;
  getProfileAvatar: (authId: string) => PromiseLike<{
    data: { id: number; avatar_url: string | null } | null;
    error: unknown;
  }>;
  setAvatarUrl: (
    authId: string,
    avatarUrl: string | null,
  ) => PromiseLike<{
    data: { id: number }[] | null;
    error: unknown;
  }>;
  storage: AvatarStorageClient;
};

export type AvatarUploadDeps = {
  getUser: () => PromiseLike<{
    data: { user: { id: string } | null };
    error: { name?: string; status?: number; code?: string } | null;
  }>;
  hasUserProfile: (authId: string) => PromiseLike<{
    exists: boolean;
    error: unknown;
  }>;
  uploadFile: (
    path: string,
    bytes: Uint8Array,
    contentType: string,
  ) => PromiseLike<{ publicUrl: string | null; error: unknown }>;
};

export function createAvatarDeleteDeps(supabase: ServerClient): AvatarDeleteDeps {
  return {
    getUser: () => supabase.auth.getUser(),
    getProfileAvatar: async (authId) => {
      const { data, error } = await supabase
        .from("users")
        .select("id, avatar_url")
        .eq("auth_id", authId)
        .maybeSingle();
      return { data, error };
    },
    setAvatarUrl: async (authId, avatarUrl) => {
      const { data, error } = await supabase
        .from("users")
        .update({ avatar_url: avatarUrl })
        .eq("auth_id", authId)
        .select("id");
      return { data, error };
    },
    storage: supabase.storage,
  };
}

export function createAvatarUploadDeps(supabase: ServerClient): AvatarUploadDeps {
  return {
    getUser: () => supabase.auth.getUser(),
    hasUserProfile: async (authId) => {
      const { data, error } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", authId)
        .maybeSingle();
      return { exists: Boolean(data), error };
    },
    uploadFile: async (path, bytes, contentType) => {
      const storage = supabase.storage.from(AVATAR_BUCKET);
      const { error } = await storage.upload(path, bytes, {
        contentType,
        upsert: false,
      });
      if (error) {
        return { publicUrl: null, error };
      }
      return { publicUrl: storage.getPublicUrl(path).data.publicUrl, error: null };
    },
  };
}

export type DeleteAvatarResult =
  | { ok: true; data: { avatar_url: null } }
  | {
      ok: false;
      status: 400 | 401 | 503;
      code: "validation" | "unauthorized" | "unavailable";
      error: string;
    };

export type UploadAvatarResult =
  | { ok: true; data: { avatar_url: string } }
  | {
      ok: false;
      status: 400 | 401 | 413 | 415 | 503;
      code: "validation" | "unauthorized" | "unavailable";
      error: string;
    };

const LIST_LIMIT = 1000;
const MAX_DELETE_BATCHES = 10;
const MAX_UPLOAD_REQUEST_BYTES = AVATAR_MAX_BYTES + 64 * 1024;
const UNAUTHORIZED_MESSAGE = "กรุณาเข้าสู่ระบบก่อนทำรายการ";
const VALIDATION_MESSAGE = "พารามิเตอร์ไม่ถูกต้อง";
const DELETE_UNAVAILABLE_MESSAGE = "ลบรูปโปรไฟล์ไม่สำเร็จ โปรดลองใหม่อีกครั้ง";
const UPLOAD_UNAVAILABLE_MESSAGE = "อัปโหลดรูปไม่สำเร็จ โปรดลองใหม่อีกครั้ง";

function isSafePathSegment(segment: string) {
  return (
    segment.length > 0 &&
    segment !== "." &&
    segment !== ".." &&
    !segment.includes("/") &&
    !segment.includes("\\")
  );
}

export async function removeOtherAvatars(
  supabase: Pick<ServerClient, "storage"> | { storage: AvatarStorageClient },
  authId: string,
  keepUrl: string | null | undefined,
) {
  if (!isSafePathSegment(authId)) return;
  const keep = avatarObjectPath(keepUrl);
  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .list(authId, { limit: LIST_LIMIT });
  if (error || !data) return;
  const files = data
    .filter(
      (file) =>
        file.id !== null &&
        typeof file.name === "string" &&
        isSafePathSegment(file.name),
    )
    .map((file) => ({
      path: `${authId}/${file.name}`,
      createdAt: file.created_at ?? "",
    }));
  const kept = keep ? files.find((file) => file.path === keep) : undefined;
  const stale = files
    .filter((file) => file.path !== keep)
    .filter((file) => !kept || file.createdAt <= kept.createdAt)
    .map((file) => file.path);
  if (stale.length > 0) {
    await supabase.storage.from(AVATAR_BUCKET).remove(stale);
  }
}

export async function removeAllUserAvatars(
  storage: AvatarStorageClient,
  authId: string,
): Promise<{ ok: true; removedCount: number } | { ok: false }> {
  if (!isSafePathSegment(authId)) {
    return { ok: false };
  }

  const bucket = storage.from(AVATAR_BUCKET);
  let removedCount = 0;
  let previousBatchKey: string | null = null;

  for (let batch = 0; batch < MAX_DELETE_BATCHES; batch += 1) {
    const { data, error } = await bucket.list(authId, { limit: LIST_LIMIT });
    if (error || !data) {
      return { ok: false };
    }

    const paths = data
      .filter(
        (file) =>
          file.id !== null &&
          typeof file.name === "string" &&
          isSafePathSegment(file.name),
      )
      .map((file) => `${authId}/${file.name}`);

    if (paths.length === 0) {
      return { ok: true, removedCount };
    }

    const batchKey = paths.join("\0");
    if (batchKey === previousBatchKey) {
      return { ok: false };
    }
    previousBatchKey = batchKey;

    const { error: removeError } = await bucket.remove(paths);
    if (removeError) {
      return { ok: false };
    }

    removedCount += paths.length;
    if (data.length < LIST_LIMIT) {
      return { ok: true, removedCount };
    }
  }

  return { ok: false };
}

function hasInvalidOrUnexpectedQuery(requestUrl: string) {
  try {
    return new URL(requestUrl).search.length > 0;
  } catch {
    return true;
  }
}

export async function uploadProfileAvatar(
  deps: AvatarUploadDeps,
  request: Request,
): Promise<UploadAvatarResult> {
  const {
    data: { user },
    error: authError,
  } = await deps.getUser();
  if (authError && !isLostSession(authError)) {
    return {
      ok: false,
      status: 503,
      code: "unavailable",
      error: UPLOAD_UNAVAILABLE_MESSAGE,
    };
  }
  if (!user) {
    return {
      ok: false,
      status: 401,
      code: "unauthorized",
      error: UNAUTHORIZED_MESSAGE,
    };
  }

  if (hasInvalidOrUnexpectedQuery(request.url)) {
    return {
      ok: false,
      status: 400,
      code: "validation",
      error: VALIDATION_MESSAGE,
    };
  }

  const { exists, error: profileError } = await deps.hasUserProfile(user.id);
  if (profileError) {
    return {
      ok: false,
      status: 503,
      code: "unavailable",
      error: UPLOAD_UNAVAILABLE_MESSAGE,
    };
  }
  if (!exists) {
    return {
      ok: false,
      status: 401,
      code: "unauthorized",
      error: UNAUTHORIZED_MESSAGE,
    };
  }

  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "multipart/form-data"
  ) {
    return {
      ok: false,
      status: 415,
      code: "validation",
      error: "กรุณาส่งไฟล์แบบ multipart/form-data",
    };
  }
  if (Number(request.headers.get("content-length") ?? 0) > MAX_UPLOAD_REQUEST_BYTES) {
    return {
      ok: false,
      status: 413,
      code: "validation",
      error: "ไฟล์รูปต้องมีขนาดไม่เกิน 2 MB",
    };
  }

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return {
      ok: false,
      status: 400,
      code: "validation",
      error: "ข้อมูลไฟล์ไม่ถูกต้อง",
    };
  }
  if (!(file instanceof File)) {
    return {
      ok: false,
      status: 400,
      code: "validation",
      error: "กรุณาเลือกไฟล์รูปภาพ",
    };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = checkAvatar(bytes);
  if (!check.ok) {
    return {
      ok: false,
      status: 400,
      code: "validation",
      error: check.error,
    };
  }

  const path = `${user.id}/${crypto.randomUUID()}.${check.extension}`;
  const { publicUrl, error: uploadError } = await deps.uploadFile(
    path,
    bytes,
    check.contentType,
  );
  if (uploadError || !publicUrl) {
    return {
      ok: false,
      status: 503,
      code: "unavailable",
      error: UPLOAD_UNAVAILABLE_MESSAGE,
    };
  }

  return { ok: true, data: { avatar_url: publicUrl } };
}

export async function deleteProfileAvatar(
  deps: AvatarDeleteDeps,
  requestUrl: string,
): Promise<DeleteAvatarResult> {
  const {
    data: { user },
    error: authError,
  } = await deps.getUser();
  if (authError && !isLostSession(authError)) {
    return {
      ok: false,
      status: 503,
      code: "unavailable",
      error: DELETE_UNAVAILABLE_MESSAGE,
    };
  }
  if (!user) {
    return {
      ok: false,
      status: 401,
      code: "unauthorized",
      error: UNAUTHORIZED_MESSAGE,
    };
  }

  if (hasInvalidOrUnexpectedQuery(requestUrl)) {
    return {
      ok: false,
      status: 400,
      code: "validation",
      error: VALIDATION_MESSAGE,
    };
  }

  const { data: profile, error: profileError } = await deps.getProfileAvatar(
    user.id,
  );
  if (profileError) {
    return {
      ok: false,
      status: 503,
      code: "unavailable",
      error: DELETE_UNAVAILABLE_MESSAGE,
    };
  }
  if (!profile) {
    return {
      ok: false,
      status: 401,
      code: "unauthorized",
      error: UNAUTHORIZED_MESSAGE,
    };
  }

  if (profile.avatar_url !== null) {
    const { data: updated, error: updateError } = await deps.setAvatarUrl(
      user.id,
      null,
    );
    if (updateError) {
      return {
        ok: false,
        status: 503,
        code: "unavailable",
        error: DELETE_UNAVAILABLE_MESSAGE,
      };
    }
    if (!updated || updated.length === 0) {
      return {
        ok: false,
        status: 401,
        code: "unauthorized",
        error: UNAUTHORIZED_MESSAGE,
      };
    }
  }

  const removed = await removeAllUserAvatars(deps.storage, user.id);
  if (!removed.ok) {
    if (profile.avatar_url !== null) {
      try {
        await deps.setAvatarUrl(user.id, profile.avatar_url);
      } catch {
        // Best-effort rollback; caller receives retryable 503 either way.
      }
    }
    return {
      ok: false,
      status: 503,
      code: "unavailable",
      error: DELETE_UNAVAILABLE_MESSAGE,
    };
  }

  return { ok: true, data: { avatar_url: null } };
}
