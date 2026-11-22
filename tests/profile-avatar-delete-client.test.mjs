import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_DELETE_AVATAR_ERROR,
  UNAUTHORIZED_DELETE_AVATAR_ERROR,
  getAvatarDeleteAction,
  parseDeleteAvatarResponse,
  requestDeleteProfileAvatar,
} from "../src/features/profile/components/avatar-delete-client.ts";

test("shows or hides the delete profile photo action according to saved and draft state", () => {
  assert.deepEqual(
    getAvatarDeleteAction({ savedAvatarUrl: null, hasLocalFile: false }),
    { visible: false, mode: "none" },
  );
  assert.deepEqual(
    getAvatarDeleteAction({ savedAvatarUrl: null, hasLocalFile: true }),
    { visible: true, mode: "clear-draft" },
  );
  assert.deepEqual(
    getAvatarDeleteAction({
      savedAvatarUrl: "https://example.test/avatars/u/a.png",
      hasLocalFile: false,
    }),
    { visible: true, mode: "delete-saved" },
  );
  assert.deepEqual(
    getAvatarDeleteAction({
      savedAvatarUrl: "https://example.test/avatars/u/a.png",
      hasLocalFile: true,
    }),
    { visible: true, mode: "delete-saved-and-draft" },
  );
});

test("parses valid 200, 401, 400, 503, and malformed delete responses safely", () => {
  assert.deepEqual(
    parseDeleteAvatarResponse(200, { success: true, data: { avatar_url: null } }),
    { kind: "ok" },
  );

  assert.deepEqual(
    parseDeleteAvatarResponse(200, { success: true, data: { avatar_url: "still-here" } }),
    { kind: "error", message: DEFAULT_DELETE_AVATAR_ERROR },
  );
  assert.deepEqual(
    parseDeleteAvatarResponse(200, null),
    { kind: "error", message: DEFAULT_DELETE_AVATAR_ERROR },
  );

  assert.deepEqual(
    parseDeleteAvatarResponse(401, {
      success: false,
      code: "unauthorized",
      error: "กรุณาเข้าสู่ระบบก่อนทำรายการ",
    }),
    { kind: "unauthorized", message: UNAUTHORIZED_DELETE_AVATAR_ERROR },
  );
  assert.deepEqual(parseDeleteAvatarResponse(401, null), {
    kind: "unauthorized",
    message: UNAUTHORIZED_DELETE_AVATAR_ERROR,
  });

  assert.deepEqual(
    parseDeleteAvatarResponse(400, {
      success: false,
      code: "validation",
      error: "พารามิเตอร์ไม่ถูกต้อง",
    }),
    { kind: "error", message: "พารามิเตอร์ไม่ถูกต้อง" },
  );

  assert.deepEqual(
    parseDeleteAvatarResponse(503, {
      success: false,
      code: "unavailable",
      error: "secret internal stack trace",
    }),
    { kind: "error", message: DEFAULT_DELETE_AVATAR_ERROR },
  );
});

test("sends DELETE /api/profile/avatar with same-origin credentials and no-store cache", async () => {
  const received = [];
  const result = await requestDeleteProfileAvatar({
    async fetchImpl(url, init) {
      received.push({ url, init });
      return new Response(
        JSON.stringify({ success: true, data: { avatar_url: null } }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    },
  });

  assert.deepEqual(result, { kind: "ok" });
  assert.equal(received.length, 1);
  assert.equal(received[0].url, "/api/profile/avatar");
  assert.equal(received[0].init.method, "DELETE");
  assert.equal(received[0].init.credentials, "same-origin");
  assert.equal(received[0].init.cache, "no-store");
});

test("handles network failure, non-JSON error pages, and AbortController cancellation", async () => {
  const networkResult = await requestDeleteProfileAvatar({
    async fetchImpl() {
      throw new TypeError("Failed to fetch");
    },
  });
  assert.deepEqual(networkResult, {
    kind: "error",
    message: DEFAULT_DELETE_AVATAR_ERROR,
  });

  const htmlErrorResult = await requestDeleteProfileAvatar({
    async fetchImpl() {
      return new Response("<html>503 Service Unavailable</html>", {
        status: 503,
        headers: { "content-type": "text/html" },
      });
    },
  });
  assert.deepEqual(htmlErrorResult, {
    kind: "error",
    message: DEFAULT_DELETE_AVATAR_ERROR,
  });

  const controller = new AbortController();
  controller.abort();
  const abortedResult = await requestDeleteProfileAvatar({
    signal: controller.signal,
    async fetchImpl(_url, init) {
      assert.equal(init.signal, controller.signal);
      throw new DOMException("Aborted", "AbortError");
    },
  });
  assert.deepEqual(abortedResult, { kind: "aborted" });
});
