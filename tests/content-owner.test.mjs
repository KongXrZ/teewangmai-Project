import assert from "node:assert/strict";
import test from "node:test";

import {
  initialContentOwner,
  markRenderedWithoutUser,
  nextContentOwner,
} from "../src/features/auth/components/content-owner.ts";

test("first signed-in user keeps the same content generation", () => {
  const first = nextContentOwner(initialContentOwner, "user-a");
  assert.equal(first.id, "user-a");
  assert.equal(first.generation, 0);
});

test("same user again returns the same owner object", () => {
  const owner = nextContentOwner(initialContentOwner, "user-a");
  assert.equal(nextContentOwner(owner, "user-a"), owner);
});

test("switching to another account starts a new generation", () => {
  const a = nextContentOwner(initialContentOwner, "user-a");
  const b = nextContentOwner(a, "user-b");
  assert.equal(b.generation, 1);
  assert.equal(nextContentOwner(b, "user-a").generation, 2);
});

test("children rendered during an auth error remount once the user is known", () => {
  const errored = markRenderedWithoutUser(initialContentOwner);
  assert.equal(errored.renderedWithoutUser, true);
  assert.equal(markRenderedWithoutUser(errored), errored);
  const recovered = nextContentOwner(errored, "user-a");
  assert.equal(recovered.generation, 1);
  assert.equal(recovered.renderedWithoutUser, false);
});

test("an auth error after the user is known does not mark a remount", () => {
  const owner = nextContentOwner(initialContentOwner, "user-a");
  assert.equal(markRenderedWithoutUser(owner), owner);
});
