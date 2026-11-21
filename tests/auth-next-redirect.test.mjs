import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getSafeRedirectPath,
  withRedirectParam,
} from "../src/features/auth/redirects.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("guest state links keep the current protected path", () => {
  assert.equal(
    withRedirectParam("/signup", "/rewards"),
    "/signup?next=%2Frewards",
  );
  assert.equal(
    withRedirectParam("/login", "/profile"),
    "/login?next=%2Fprofile",
  );
});

test("switch links between login and signup keep a safe next path", () => {
  assert.equal(
    withRedirectParam("/signup", "/rewards?tab=vouchers"),
    "/signup?next=%2Frewards%3Ftab%3Dvouchers",
  );
  assert.equal(
    withRedirectParam("/login", "/rewards"),
    "/login?next=%2Frewards",
  );
});

test("root, missing, and unsafe next values leave the link without next", () => {
  for (const next of [
    undefined,
    null,
    "",
    "/",
    "https://outside.invalid",
    "//outside.invalid",
    "/\\outside.invalid",
    "javascript:alert(1)",
    "/%2foutside.invalid",
  ]) {
    assert.equal(withRedirectParam("/signup", next), "/signup", String(next));
  }
});

test("signup redirect target falls back to home for unsafe values", () => {
  assert.equal(getSafeRedirectPath("/rewards"), "/rewards");
  assert.equal(getSafeRedirectPath(undefined), "/");
  assert.equal(getSafeRedirectPath("https://outside.invalid"), "/");
});

test("guest state, auth pages, and signup form use the next parameter", () => {
  const guestState = read("src/features/auth/components/guest-state.tsx");
  assert.match(guestState, /withRedirectParam\("\/signup", pathname\)/);
  assert.match(guestState, /router\.push\(signupHref\)/);

  const loginPage = read("src/app/login/page.tsx");
  assert.match(loginPage, /switchHref=\{withRedirectParam\("\/signup", next\)\}/);

  const signupPage = read("src/app/signup/page.tsx");
  assert.match(signupPage, /switchHref=\{withRedirectParam\("\/login", next\)\}/);
  assert.match(signupPage, /<SignupForm redirectTo=\{next\} \/>/);

  const signupForm = read("src/features/auth/components/signup-form.tsx");
  assert.match(signupForm, /router\.replace\(getSafeRedirectPath\(redirectTo\)\)/);
  assert.doesNotMatch(signupForm, /router\.replace\("\/"\)/);
});
