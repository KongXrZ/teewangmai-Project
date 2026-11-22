import assert from "node:assert/strict";
import test from "node:test";

import jsQR from "jsqr";

import { buildVoucherQrShape } from "../src/features/rewards/voucher-qr.ts";

test("the QR shape scans back to the server use code", () => {
  const code = "0123456789abcdef0123456789abcdef";
  const { viewBoxSize, path } = buildVoucherQrShape(code);
  const scale = 6;
  const width = viewBoxSize * scale;
  const pixels = new Uint8ClampedArray(width * width * 4).fill(255);

  for (const [, x, y] of path.matchAll(/M(\d+) (\d+)h1v1h-1z/g)) {
    for (let py = Number(y) * scale; py < (Number(y) + 1) * scale; py += 1) {
      for (let px = Number(x) * scale; px < (Number(x) + 1) * scale; px += 1) {
        const offset = (py * width + px) * 4;
        pixels[offset] = 0;
        pixels[offset + 1] = 0;
        pixels[offset + 2] = 0;
      }
    }
  }

  assert.equal(jsQR(pixels, width, width)?.data, code);
});
