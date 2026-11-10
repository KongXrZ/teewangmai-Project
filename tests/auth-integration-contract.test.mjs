import assert from "node:assert/strict";
import test from "node:test";
import { getSafeRedirectPath } from "../src/features/auth/redirects.ts";
import {
  AUTH_UNAVAILABLE,
  getAuthErrorCode,
  getAuthErrorMessage,
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
