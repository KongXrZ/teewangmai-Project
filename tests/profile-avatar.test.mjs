import assert from "node:assert/strict";
import test from "node:test";
import {
  AVATAR_MAX_BYTES,
  avatarObjectPath,
  checkAvatar,
} from "../src/features/profile/avatar.ts";

const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const jpg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);

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
