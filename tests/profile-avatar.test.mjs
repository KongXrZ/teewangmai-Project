import assert from "node:assert/strict";
import test from "node:test";
import {
  AVATAR_BUCKET,
  AVATAR_MAX_BYTES,
  avatarObjectPath,
  checkAvatar,
} from "../src/features/profile/avatar.ts";
import {
  createAvatarDeleteDeps,
  deleteProfileAvatar,
  removeAllUserAvatars,
} from "../src/features/profile/server/avatar-storage.ts";

const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const jpg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const avatarUrl = "http://localhost:3000/api/profile/avatar";
const authId = "00000000-0000-4000-8000-00000000000a";

function createFakeClient({
  user = { id: authId },
  authError = null,
  updatedRows = [{ id: 1 }],
  updateError = null,
  listResponses = [{ data: [], error: null }],
  removeError = null,
} = {}) {
  const calls = {
    table: null,
    updatePayload: null,
    eqColumn: null,
    eqValue: null,
    selectColumns: null,
    buckets: [],
    listFolders: [],
    removedBatches: [],
  };
  let listIndex = 0;

  const client = {
    auth: {
      async getUser() {
        return { data: { user }, error: authError };
      },
    },
    from(table) {
      calls.table = table;
      return {
        update(values) {
          calls.updatePayload = values;
          return {
            eq(column, value) {
              calls.eqColumn = column;
              calls.eqValue = value;
              return {
                async select(columns) {
                  calls.selectColumns = columns;
                  return { data: updatedRows, error: updateError };
                },
              };
            },
          };
        },
      };
    },
    storage: {
      from(bucket) {
        calls.buckets.push(bucket);
        return {
          async list(folder) {
            calls.listFolders.push(folder);
            const response = listResponses[Math.min(listIndex, listResponses.length - 1)];
            listIndex += 1;
            return response;
          },
          async remove(paths) {
            calls.removedBatches.push(paths);
            return { data: [], error: removeError };
          },
        };
      },
    },
  };

  return { deps: createAvatarDeleteDeps(client), storage: client.storage, calls };
}

test("detects JPEG and PNG from the file bytes", () => {
  assert.deepEqual(checkAvatar(png), { ok: true, contentType: "image/png", extension: "png" });
  assert.deepEqual(checkAvatar(jpg), { ok: true, contentType: "image/jpeg", extension: "jpg" });
});

test("rejects empty, oversized, other formats and renamed non-images", () => {
  assert.equal(checkAvatar(new Uint8Array()).ok, false);
  const big = new Uint8Array(AVATAR_MAX_BYTES + 1);
  big.set(png);
  assert.equal(checkAvatar(big).ok, false);
  assert.equal(checkAvatar(new TextEncoder().encode("GIF89a")).ok, false);
  assert.equal(checkAvatar(new TextEncoder().encode("not an image")).ok, false);
});

test("accepts a file exactly at the 2 MB limit", () => {
  const edge = new Uint8Array(AVATAR_MAX_BYTES);
  edge.set(jpg);
  assert.equal(checkAvatar(edge).ok, true);
});

test("finds the storage path of an avatar public URL only", () => {
  assert.equal(
    avatarObjectPath("http://127.0.0.1:54321/storage/v1/object/public/avatars/uid/a%20b.png"),
    "uid/a b.png",
  );
  assert.equal(
    avatarObjectPath("http://127.0.0.1:54321/storage/v1/object/public/avatars/uid/x.png?t=1"),
    "uid/x.png",
  );
  assert.equal(avatarObjectPath("https://example.com/photo.png"), null);
  assert.equal(avatarObjectPath("not a url"), null);
  assert.equal(avatarObjectPath(null), null);
});

test("deletes avatar_url only and removes files inside the caller folder", async () => {
  const { deps, calls } = createFakeClient({
    listResponses: [
      {
        data: [
          { id: "file-1", name: "current.png" },
          { id: "file-2", name: "old.jpg" },
        ],
        error: null,
      },
    ],
  });

  const result = await deleteProfileAvatar(deps, avatarUrl);

  assert.deepEqual(result, { ok: true, data: { avatar_url: null } });
  assert.equal(calls.table, "users");
  assert.deepEqual(calls.updatePayload, { avatar_url: null });
  assert.equal(calls.eqColumn, "auth_id");
  assert.equal(calls.eqValue, authId);
  assert.deepEqual(calls.buckets, [AVATAR_BUCKET]);
  assert.deepEqual(calls.listFolders, [authId]);
  assert.deepEqual(calls.removedBatches, [[`${authId}/current.png`, `${authId}/old.jpg`]]);
});

test("is idempotent when avatar_url is already null and storage has no files", async () => {
  const { deps, calls } = createFakeClient({
    listResponses: [{ data: [], error: null }],
  });

  const first = await deleteProfileAvatar(deps, avatarUrl);
  const second = await deleteProfileAvatar(deps, `${avatarUrl}?`);

  assert.deepEqual(first, { ok: true, data: { avatar_url: null } });
  assert.deepEqual(second, { ok: true, data: { avatar_url: null } });
  assert.deepEqual(calls.removedBatches, []);
});

test("cleans up leftover files while skipping folder entries and unsafe names", async () => {
  const { storage, calls } = createFakeClient({
    listResponses: [
      {
        data: [
          { id: null, name: "nested-folder" },
          { id: "file-bad-1", name: "../other.png" },
          { id: "file-bad-2", name: "sub/file.png" },
          { id: "file-ok", name: "stale.png" },
        ],
        error: null,
      },
    ],
  });

  const result = await removeAllUserAvatars(storage, authId);

  assert.deepEqual(result, { ok: true, removedCount: 1 });
  assert.deepEqual(calls.removedBatches, [[`${authId}/stale.png`]]);
});

test("paginates storage removal when the user folder reaches the list limit", async () => {
  const fullPage = Array.from({ length: 1000 }, (_, index) => ({
    id: `file-${index}`,
    name: `img-${index}.png`,
  }));
  const { storage, calls } = createFakeClient({
    listResponses: [
      { data: fullPage, error: null },
      { data: [{ id: "file-last", name: "last.jpg" }], error: null },
    ],
  });

  const result = await removeAllUserAvatars(storage, authId);

  assert.deepEqual(result, { ok: true, removedCount: 1001 });
  assert.equal(calls.removedBatches.length, 2);
  assert.equal(calls.removedBatches[0].length, 1000);
  assert.deepEqual(calls.removedBatches[1], [`${authId}/last.jpg`]);
});

test("returns 401 unauthorized when session is missing, expired, or profile is absent", async () => {
  for (const config of [
    { user: null, authError: null },
    { user: null, authError: { name: "AuthSessionMissingError" } },
    { user: null, authError: { status: 401, code: "bad_jwt" } },
    { user: { id: authId }, updatedRows: [] },
  ]) {
    const { deps, calls } = createFakeClient(config);
    const result = await deleteProfileAvatar(deps, avatarUrl);
    assert.equal(result.ok, false);
    assert.equal(result.status, 401);
    assert.equal(result.code, "unauthorized");
    assert.deepEqual(calls.listFolders, []);
    assert.deepEqual(calls.removedBatches, []);
  }
});

test("returns 400 validation for unsupported query parameters without touching DB or storage", async () => {
  const { deps, calls } = createFakeClient();

  for (const url of [
    `${avatarUrl}?force=true`,
    `${avatarUrl}?user_id=2`,
    `${avatarUrl}?foo`,
  ]) {
    const result = await deleteProfileAvatar(deps, url);
    assert.equal(result.ok, false);
    assert.equal(result.status, 400);
    assert.equal(result.code, "validation");
  }

  assert.equal(calls.table, null);
  assert.deepEqual(calls.listFolders, []);
  assert.deepEqual(calls.removedBatches, []);
});

test("returns 503 unavailable and preserves existing storage files when DB update fails", async () => {
  const { deps, calls } = createFakeClient({
    updateError: { message: "internal postgres relation error" },
    listResponses: [{ data: [{ id: "file-1", name: "active.png" }], error: null }],
  });

  const result = await deleteProfileAvatar(deps, avatarUrl);

  assert.equal(result.ok, false);
  assert.equal(result.status, 503);
  assert.equal(result.code, "unavailable");
  assert.doesNotMatch(result.error, /postgres|relation/i);
  assert.deepEqual(calls.listFolders, []);
  assert.deepEqual(calls.removedBatches, []);
});

test("returns 503 unavailable without leaking internal errors when auth or storage fails", async () => {
  const authFailure = createFakeClient({
    user: null,
    authError: { name: "AuthRetryableFetchError", status: 503 },
  });
  const authResult = await deleteProfileAvatar(authFailure.deps, avatarUrl);
  assert.equal(authResult.ok, false);
  assert.equal(authResult.status, 503);
  assert.equal(authResult.code, "unavailable");
  assert.equal(authFailure.calls.table, null);

  const listFailure = createFakeClient({
    listResponses: [{ data: null, error: { message: "secret storage bucket fault" } }],
  });
  const listResult = await deleteProfileAvatar(listFailure.deps, avatarUrl);
  assert.equal(listResult.ok, false);
  assert.equal(listResult.status, 503);
  assert.equal(listResult.code, "unavailable");
  assert.doesNotMatch(listResult.error, /secret|bucket/i);
  assert.deepEqual(listFailure.calls.removedBatches, []);

  const removeFailure = createFakeClient({
    listResponses: [{ data: [{ id: "file-1", name: "a.png" }], error: null }],
    removeError: { message: "secret s3 timeout" },
  });
  const removeResult = await deleteProfileAvatar(removeFailure.deps, avatarUrl);
  assert.equal(removeResult.ok, false);
  assert.equal(removeResult.status, 503);
  assert.equal(removeResult.code, "unavailable");
  assert.doesNotMatch(removeResult.error, /secret|s3|timeout/i);
});

test("rejects unsafe authId path traversal before calling storage", async () => {
  const { storage, calls } = createFakeClient();
  const result = await removeAllUserAvatars(storage, "../other-user");
  assert.deepEqual(result, { ok: false });
  assert.deepEqual(calls.listFolders, []);
  assert.deepEqual(calls.removedBatches, []);
});
