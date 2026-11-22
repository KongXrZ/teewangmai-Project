import assert from "node:assert/strict";
import test from "node:test";

import {
  isOptimizableImageUrl,
  REMOTE_IMAGE_HOSTS,
} from "../src/features/locations/remote-image-hosts.ts";

test("seed building image hosts are allowed for next/image optimization", () => {
  assert.equal(
    isOptimizableImageUrl("https://bgm.kmutt.ac.th/wp-content/uploads/a.jpg"),
    true,
  );
  assert.equal(
    isOptimizableImageUrl("https://www.kmutt.ac.th/wp-content/uploads/b.jpg"),
    true,
  );
  assert.equal(
    isOptimizableImageUrl("https://encrypted-tbn0.gstatic.com/images?q=tbn:x"),
    true,
  );
  assert.equal(
    isOptimizableImageUrl(
      "https://upload.wikimedia.org/wikipedia/commons/a/a1/x.jpg?utm_source=y",
    ),
    true,
  );
  assert.equal(isOptimizableImageUrl("/images/KMUTT-Map.png"), true);
});

test("unknown hosts, insecure urls and malformed values fall back to unoptimized", () => {
  assert.equal(
    isOptimizableImageUrl("https://today.line.me/th/v3/article/x"),
    false,
  );
  assert.equal(isOptimizableImageUrl("http://bgm.kmutt.ac.th/a.jpg"), false);
  assert.equal(isOptimizableImageUrl("https://evil.example.com/a.jpg"), false);
  assert.equal(isOptimizableImageUrl("//bgm.kmutt.ac.th/a.jpg"), false);
  assert.equal(isOptimizableImageUrl("not a url"), false);
  assert.equal(new Set(REMOTE_IMAGE_HOSTS).size, REMOTE_IMAGE_HOSTS.length);
});
