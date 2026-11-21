import assert from "node:assert/strict";
import test from "node:test";
import { getAuthenticatedRedirect } from "../src/features/auth/redirects.ts";

test("authenticated users on login and signup are sent home by default", () => {
  for (const pathname of ["/login", "/signup", "/login/", "/signup/"]) {
    assert.equal(getAuthenticatedRedirect(pathname), "/");
  }
});

test("authenticated redirect keeps a safe next path", () => {
  assert.equal(
    getAuthenticatedRedirect("/login", "/rewards?tab=vouchers"),
    "/rewards?tab=vouchers",
  );
});

test("authenticated redirect rejects unsafe next paths", () => {
  for (const next of ["https://outside.invalid", "//outside.invalid", "/\\x"]) {
    assert.equal(getAuthenticatedRedirect("/login", next), "/");
  }
});

test("other paths are not redirected", () => {
  for (const pathname of ["/", "/profile", "/login-help", "/auth/callback"]) {
    assert.equal(getAuthenticatedRedirect(pathname, "/profile"), null);
  }
});
