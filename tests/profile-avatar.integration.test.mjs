import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

const base = process.env.PROFILE_AVATAR_TEST_URL;

const tinyPng = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41,
  0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
  0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

async function signUpAndLogin() {
  const email = `avatar-${randomUUID()}@example.test`;
  const password = `Avatar-${randomUUID()}`;
  const headers = { "content-type": "application/json" };
  const signup = await fetch(new URL("/api/auth/signup", base), {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password, name: "Avatar Delete Test" }),
  });
  assert.equal(signup.status, 200);
  const login = await fetch(new URL("/api/auth/login", base), {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password }),
  });
  assert.equal(login.status, 200);
  return login.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
}

test("profile avatar delete rejects anonymous callers and documents OpenAPI", { skip: !base }, async () => {
  const anonymous = await fetch(new URL("/api/profile/avatar", base), { method: "DELETE" });
  assert.equal(anonymous.status, 401);
  assert.match(anonymous.headers.get("cache-control") ?? "", /no-store/);
  const body = await anonymous.json();
  assert.equal(body.success, false);
  assert.equal(body.code, "unauthorized");

  const swagger = await fetch(new URL("/api/swagger", base)).then((response) => response.text());
  assert.match(swagger, /\/api\/profile\/avatar/);
  assert.match(swagger, /Delete profile photo/);
});

test("profile avatar delete removes uploaded files and is idempotent", { skip: !base }, async () => {
  const cookie = await signUpAndLogin();
  assert.ok(cookie.length > 0);

  const badQuery = await fetch(new URL("/api/profile/avatar?force=true", base), {
    method: "DELETE",
    headers: { cookie },
  });
  assert.equal(badQuery.status, 400);
  assert.equal((await badQuery.json()).code, "validation");

  const form = new FormData();
  form.append("file", new Blob([tinyPng], { type: "image/png" }), "avatar.png");
  const upload = await fetch(new URL("/api/profile/avatar", base), {
    method: "POST",
    headers: { cookie },
    body: form,
  });
  assert.equal(upload.status, 200);
  const uploadedUrl = (await upload.json()).data.avatar_url;
  assert.equal(typeof uploadedUrl, "string");

  const removed = await fetch(new URL("/api/profile/avatar", base), {
    method: "DELETE",
    headers: { cookie },
  });
  assert.equal(removed.status, 200);
  assert.match(removed.headers.get("cache-control") ?? "", /no-store/);
  assert.deepEqual(await removed.json(), { success: true, data: { avatar_url: null } });

  const repeated = await fetch(new URL("/api/profile/avatar", base), {
    method: "DELETE",
    headers: { cookie },
  });
  assert.equal(repeated.status, 200);
  assert.deepEqual(await repeated.json(), { success: true, data: { avatar_url: null } });

  const me = await fetch(new URL("/api/auth/me", base), { headers: { cookie } });
  assert.equal(me.status, 200);
  const meBody = await me.json();
  assert.equal(meBody.profile.avatar_url, null);
});
