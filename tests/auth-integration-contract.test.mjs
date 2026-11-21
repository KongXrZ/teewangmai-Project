import assert from "node:assert/strict";
import test from "node:test";
import {
  getSafeRedirectPath,
  resolveSiteOrigin,
} from "../src/features/auth/redirects.ts";
import {
  AUTH_UNAVAILABLE,
  getAuthErrorCode,
  getAuthErrorMessage,
  readJsonInput,
  resolveProfileUpdateOutcome,
} from "../src/features/auth/errors.ts";
import { signUpSchema } from "../src/features/auth/schemas.ts";

test("login and callback allow internal paths, query strings, and fragments", () => {
  assert.equal(
    getSafeRedirectPath("/locations?category=library#floor-2"),
    "/locations?category=library#floor-2",
  );
  assert.equal(getSafeRedirectPath("/"), "/");
});

test("login and callback reject external, disguised, and malformed redirects", () => {
  for (const next of [
    undefined,
    "",
    "https://outside.invalid",
    "//outside.invalid",
    "/\\outside.invalid",
    "javascript:alert(1)",
    "/%2foutside.invalid",
    "/%5coutside.invalid",
    "/\noutside.invalid",
    "/%00",
    "/%E0%A4%A",
  ]) {
    assert.equal(getSafeRedirectPath(next), "/", String(next));
  }
});

test("only recognized auth codes become public messages", () => {
  const internal = {
    code: "database_error",
    message: "private database configuration",
  };
  assert.equal(getAuthErrorMessage(internal), AUTH_UNAVAILABLE);
  assert.equal(getAuthErrorCode(internal), "unavailable");
  assert.equal(
    getAuthErrorCode({ code: "invalid_credentials" }),
    "unauthorized",
  );
  assert.equal(
    getAuthErrorCode({ code: "over_request_rate_limit" }),
    "rate_limited",
  );
  assert.equal(getAuthErrorCode({ code: "weak_password" }), "rejected");
  assert.notEqual(
    getAuthErrorMessage({ code: "invalid_credentials" }),
    AUTH_UNAVAILABLE,
  );
  assert.notEqual(
    getAuthErrorMessage({ code: "email_not_confirmed" }),
    AUTH_UNAVAILABLE,
  );
});

test("signup enforces the shared name/password bounds and strips non-contract fields", () => {
  const input = {
    name: "AB",
    email: "student@kmutt.ac.th",
    password: "12345678",
  };
  assert.equal(signUpSchema.safeParse(input).success, true);
  for (const invalid of [
    { name: "A" },
    { name: "A".repeat(51) },
    { password: "1".repeat(7) },
    { password: "1".repeat(101) },
  ]) {
    assert.equal(
      signUpSchema.safeParse({ ...input, ...invalid }).success,
      false,
    );
  }
  assert.deepEqual(
    signUpSchema.parse({
      ...input,
      confirmPassword: "12345678",
      points: 999,
      avatar_url: "javascript:alert(1)",
    }),
    input,
  );
});

test("readJsonInput returns code: validation on non-JSON (415) and malformed JSON (400)", async () => {
  const nonJson = await readJsonInput(
    new Request("http://localhost:3000/api/checkins", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "hello",
    }),
  );
  assert.equal(nonJson.success, false);
  if (!nonJson.success) {
    assert.equal(nonJson.status, 415);
    assert.equal(nonJson.body.code, "validation");
  }

  const malformed = await readJsonInput(
    new Request("http://localhost:3000/api/vouchers/verify", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: "{bad json",
    }),
  );
  assert.equal(malformed.success, false);
  if (!malformed.success) {
    assert.equal(malformed.status, 400);
    assert.equal(malformed.body.code, "validation");
  }
});

test("resolveSiteOrigin uses fallback only in development and fails closed in production", () => {
  assert.equal(
    resolveSiteOrigin({ configuredSiteUrl: undefined, nodeEnv: "development" }),
    "http://localhost:3000",
  );
  assert.equal(
    resolveSiteOrigin({ configuredSiteUrl: undefined, nodeEnv: "production" }),
    null,
  );
  assert.equal(
    resolveSiteOrigin({ configuredSiteUrl: "", nodeEnv: "production" }),
    null,
  );
  assert.equal(
    resolveSiteOrigin({
      configuredSiteUrl: "https://teewangmai.app/path?x=1",
      nodeEnv: "production",
    }),
    "https://teewangmai.app",
  );
  assert.equal(
    resolveSiteOrigin({
      configuredSiteUrl: "javascript:alert(1)",
      nodeEnv: "development",
    }),
    null,
  );
});

test("resolveProfileUpdateOutcome hides raw DB errors and rejects zero updated rows", () => {
  const dbFailed = resolveProfileUpdateOutcome(null, {
    message: "duplicate key value violates unique constraint users_pkey",
  });
  assert.equal(dbFailed.success, false);
  assert.equal(dbFailed.code, "unavailable");
  assert.equal(dbFailed.error, AUTH_UNAVAILABLE);

  const zeroRows = resolveProfileUpdateOutcome([], null);
  assert.equal(zeroRows.success, false);
  assert.equal(zeroRows.code, "rejected");

  const updated = resolveProfileUpdateOutcome([{ id: 1 }], null);
  assert.equal(updated.success, true);
  assert.equal(getAuthErrorCode({ code: "same_password" }), "rejected");
  assert.notEqual(
    getAuthErrorMessage({ code: "same_password" }),
    AUTH_UNAVAILABLE,
  );
});
