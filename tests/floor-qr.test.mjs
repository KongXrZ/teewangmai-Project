import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { generateFloorQr, validateFloorRows, decodePngPayload } from "../scripts/lib/floor-qr.mjs";
import { parseFloorQrPayload } from "../src/features/quick-scan/floor-qr-payload.ts";

const first = {
  location_id: 10, building: "N16", building_name: "Learning & <Exchange>", location_active: true,
  floor_id: 100, floor_name: "1", floor_active: true, qr_code_id: "7dfd82f0-cdbe-47e3-b8e8-c06338554a57",
};

test("floor payload uses the existing UUID and rejects URLs or invented location payloads", () => {
  assert.equal(parseFloorQrPayload(first.qr_code_id), first.qr_code_id);
  assert.equal(parseFloorQrPayload(`  ${first.qr_code_id}\n`), first.qr_code_id);
  for (const input of [null, 123, "", "N16-floor-1", `https://example.com/${first.qr_code_id}`,
    JSON.stringify({ floor_id: 100 }), "00000000-0000-0000-0000-000000000000"]) {
    assert.equal(parseFloorQrPayload(input), null);
  }
});

test("snapshot validation refuses ambiguous mappings before any files are generated", () => {
  assert.throws(() => validateFloorRows([first, first]), /Duplicate/);
  assert.throws(() => validateFloorRows([{ ...first, qr_code_id: "missing" }]));
  assert.throws(() => validateFloorRows([{ ...first, location_active: "true" }]));
  assert.throws(() => validateFloorRows([first, { ...first, floor_id: 101,
    floor_name: "2", building: "N17", qr_code_id: "2bb695b4-0bc1-4be7-ae7d-32f33db3856c" }]), /Inconsistent/);
});

test("generated PNG decodes to its original identifier, repeat batches preserve IDs and closed floors stay out of print", async () => {
  const root = await mkdtemp(join(tmpdir(), "teewangmai-floor-qr-"));
  try {
    const closedBuilding = { ...first, location_id: 11, building: "S7", location_active: false,
      floor_id: 200, qr_code_id: "2bb695b4-0bc1-4be7-ae7d-32f33db3856c" };
    const closedFloor = { ...first, floor_id: 101, floor_name: "2", floor_active: false,
      qr_code_id: "15ad2048-3665-49ec-aacb-9658b3f90c11" };
    const input = [closedBuilding, first, closedFloor];
    const output = join(root, "batch-1");
    const manifest = await generateFloorQr(input, output);
    assert.equal(manifest.total_floors, 3);
    assert.equal(manifest.printable_floors, 1);
    const entry = manifest.entries.find((row) => row.floor_id === 100);
    assert.equal(decodePngPayload(await readFile(join(output, entry.png))), first.qr_code_id);
    assert.equal((await readdir(join(output, "png"))).length, 1);
    assert.ok((await readFile(join(output, entry.svg), "utf8")).startsWith("<svg"));
    assert.ok(manifest.entries.filter((row) => !row.printable).every((row) => row.svg === null && row.png === null));
    const html = await readFile(join(output, "print.html"), "utf8");
    assert.match(html, /Learning &amp; &lt;Exchange&gt;/);
    assert.equal(html.includes("S7"), false);
    const second = await generateFloorQr(input, join(root, "batch-2"));
    assert.deepEqual(second.entries, manifest.entries);
    assert.deepEqual(JSON.parse(await readFile(join(output, "manifest.json"), "utf8")), manifest);
    await assert.rejects(generateFloorQr(input, output), { code: "EEXIST" });
    assert.deepEqual(JSON.parse(await readFile(join(output, "manifest.json"), "utf8")), manifest);
    await assert.rejects(generateFloorQr([{ ...first, qr_code_id: "bad" }], join(root, "invalid")));
    await assert.rejects(access(join(root, "invalid")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("empty data produces an explicit empty print sheet and manifest", async () => {
  const root = await mkdtemp(join(tmpdir(), "teewangmai-empty-qr-"));
  try {
    const output = join(root, "batch");
    const manifest = await generateFloorQr([], output);
    assert.equal(manifest.printable_floors, 0);
    assert.deepEqual(manifest.entries, []);
    assert.equal((await readdir(join(output, "png"))).length, 0);
    assert.match(await readFile(join(output, "print.html"), "utf8"), /class="empty"/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
