import type { createClient } from "@/lib/supabase/server";
import { AVATAR_BUCKET, avatarObjectPath } from "../avatar.ts";
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
};

export type AvatarStorageClient = {
  from: (bucket: string) => AvatarStorageBucket;
};

export type AvatarDeleteDeps = {
  getUser: () => PromiseLike<{
    data: { user: { id: string } | null };
    error: { name?: string; status?: number; code?: string } | null;
  }>;
  clearAvatarUrl: (authId: string) => PromiseLike<{
    data: { id: number }[] | null;
    error: unknown;
  }>;
  storage: AvatarStorageClient;
};

export function createAvatarDeleteDeps(supabase: ServerClient): AvatarDeleteDeps {
  return {
    getUser: () => supabase.auth.getUser(),
    clearAvatarUrl: async (authId) => {
      const { data, error } = await supabase
        .from("users")
        .update({ avatar_url: null })
        .eq("auth_id", authId)
        .select("id");
      return { data, error };
    },
    storage: supabase.storage,
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

const LIST_LIMIT = 1000;
const MAX_DELETE_BATCHES = 10;
const UNAUTHORIZED_MESSAGE = "กรุณาเข้าสู่ระบบก่อนทำรายการ";
const VALIDATION_MESSAGE = "พารามิเตอร์ไม่ถูกต้อง";
const DELETE_UNAVAILABLE_MESSAGE = "ลบรูปโปรไฟล์ไม่สำเร็จ โปรดลองใหม่อีกครั้ง";

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
  supabase: ServerClient,
  authId: string,
  keepUrl: string | null | undefined,
) {
  const keep = avatarObjectPath(keepUrl);
  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .list(authId, { limit: LIST_LIMIT });
  if (error || !data) return;
  const files = data.map((file) => ({
    path: `${authId}/${file.name}`,
    createdAt: file.created_at,
  }));
  const kept = files.find((file) => file.path === keep);
  const stale = files
    .filter((file) => file.path !== keep)
    .filter((file) => !kept || (file.createdAt ?? "") < (kept.createdAt ?? ""))
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

  let hasQuery = false;
  try {
    hasQuery = new URL(requestUrl).search.length > 0;
  } catch {
    return {
      ok: false,
      status: 400,
      code: "validation",
      error: VALIDATION_MESSAGE,
    };
  }
  if (hasQuery) {
    return {
      ok: false,
      status: 400,
      code: "validation",
      error: VALIDATION_MESSAGE,
    };
  }

  const { data: updated, error: updateError } = await deps.clearAvatarUrl(user.id);
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

  const removed = await removeAllUserAvatars(deps.storage, user.id);
  if (!removed.ok) {
    return {
      ok: false,
      status: 503,
      code: "unavailable",
      error: DELETE_UNAVAILABLE_MESSAGE,
    };
  }

  return { ok: true, data: { avatar_url: null } };
}
