import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import QRCode from "qrcode";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import { z } from "zod";
import { FLOOR_QR_PAYLOAD_FORMAT, parseFloorQrPayload } from "../../src/features/quick-scan/floor-qr-payload.ts";

const rowSchema = z.object({
  location_id: z.number().int().positive(),
  building: z.string().regex(/^[NS][0-9]+$/),
  building_name: z.string().trim().min(1),
  location_active: z.boolean(),
  floor_id: z.number().int().positive(),
  floor_name: z.string().trim().min(1),
  floor_active: z.boolean(),
  qr_code_id: z.string().transform((value) => value.toLowerCase())
    .refine((value) => parseFloorQrPayload(value) === value),
});

export function validateFloorRows(input) {
  const rows = z.array(rowSchema).parse(input);
  const floorIds = new Set();
  const identifiers = new Set();
  const buildingIds = new Map();
  const buildingCodes = new Map();
  const floorNames = new Set();
  for (const row of rows) {
    const key = row.qr_code_id;
    const floorKey = JSON.stringify([row.location_id, row.floor_name]);
    if (floorIds.has(row.floor_id) || identifiers.has(key) || floorNames.has(floorKey)) {
      throw new Error("Duplicate floor identity, floor name or QR identifier in source");
    }
    const identity = JSON.stringify([row.building, row.building_name, row.location_active]);
    if ((buildingIds.has(row.location_id) && buildingIds.get(row.location_id) !== identity)
      || (buildingCodes.has(row.building) && buildingCodes.get(row.building) !== row.location_id)) {
      throw new Error("Inconsistent building mapping in source");
    }
    floorIds.add(row.floor_id);
    identifiers.add(key);
    floorNames.add(floorKey);
    buildingIds.set(row.location_id, identity);
    buildingCodes.set(row.building, row.location_id);
  }
  return rows.sort((a, b) => a.building.localeCompare(b.building, "en", { numeric: true })
    || a.floor_name.localeCompare(b.floor_name, "en", { numeric: true }) || a.floor_id - b.floor_id);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

export function renderPrintSheet(cards) {
  const pages = [];
  for (let offset = 0; offset < cards.length; offset += 6) {
    const items = cards.slice(offset, offset + 6).map(({ row, svg }) => `
      <article class="card">
        <h1>TeeWangMai? · ${escapeHtml(row.building)}</h1>
        <p class="name">${escapeHtml(row.building_name)}</p>
        <h2>ชั้น ${escapeHtml(row.floor_name)}</h2>
        <div class="qr">${svg}</div>
        <p>สแกนเพื่อเช็คอินและรายงานความหนาแน่น</p>
        <small>อาคาร ${row.location_id} · ชั้น ID ${row.floor_id}</small>
      </article>`).join("");
    pages.push(`<section class="sheet" aria-label="หน้าพิมพ์ ${pages.length + 1}">${items}</section>`);
  }
  const body = pages.length ? pages.join("\n") : '<p class="empty">ไม่มีอาคารและชั้นที่ active สำหรับสร้างชุดพิมพ์</p>';
  return `<!doctype html>
<html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>TeeWangMai? — Floor QR</title><style>
@page { size: A4 portrait; margin: 10mm; }
* { box-sizing: border-box; }
body { margin: 0; color: #000; background: #eee; font-family: "Noto Sans Thai", Tahoma, sans-serif; }
.sheet { width: 190mm; height: 277mm; margin: 8mm auto; background: #fff;
  display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); grid-template-rows: repeat(3,87mm); gap: 4mm; }
.card { border: 0.3mm solid #000; padding: 3mm; text-align: center; break-inside: avoid; overflow: hidden; }
h1 { margin: 0; font-size: 15pt; line-height: 1.3; }
.name { height: 10mm; margin: 1mm 0; font-size: 10pt; line-height: 1.3; overflow-wrap: anywhere; }
h2 { margin: 0; font-size: 14pt; line-height: 1.3; }
.qr { width: 46mm; height: 46mm; margin: 1mm auto; }
.qr svg { display: block; width: 100%; height: 100%; }
p { margin: 1mm 0; font-size: 9pt; } small { font-size: 8pt; }
.empty { margin: 2rem; }
@media print { body { background: #fff; } .sheet { margin: 0; break-after: page; } .sheet:last-child { break-after: auto; } }
</style></head><body>${body}</body></html>\n`;
}

export function decodePngPayload(buffer) {
  const png = PNG.sync.read(buffer);
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height, { inversionAttempts: "dontInvert" });
  return decoded?.data ?? null;
}

export async function generateFloorQr(input, outputPath) {
  const rows = validateFloorRows(input);
  const output = resolve(outputPath);
  await mkdir(dirname(output), { recursive: true });
  await mkdir(output);
  try {
    await mkdir(join(output, "svg"));
    await mkdir(join(output, "png"));
    const cards = [];
    const entries = [];
    for (const row of rows) {
      const active = row.location_active && row.floor_active;
      const entry = { ...row, payload: row.qr_code_id, printable: active, svg: null, png: null, png_sha256: null };
      if (active) {
        const name = `${row.building}-floor-${row.floor_id}`;
        const options = { errorCorrectionLevel: "M", margin: 4, color: { dark: "#000000", light: "#ffffff" } };
        const svg = await QRCode.toString(entry.payload, { ...options, type: "svg" });
        const png = await QRCode.toBuffer(entry.payload, { ...options, type: "png", width: 512 });
        if (decodePngPayload(png) !== entry.payload) throw new Error(`QR decode verification failed for floor ${row.floor_id}`);
        entry.svg = `svg/${name}.svg`;
        entry.png = `png/${name}.png`;
        entry.png_sha256 = createHash("sha256").update(png).digest("hex");
        await writeFile(join(output, entry.svg), svg, "utf8");
        await writeFile(join(output, entry.png), png);
        cards.push({ row, svg });
      }
      entries.push(entry);
    }
    const manifest = {
      format: FLOOR_QR_PAYLOAD_FORMAT,
      generated_at: new Date().toISOString(),
      total_floors: rows.length,
      printable_floors: cards.length,
      entries,
    };
    await writeFile(join(output, "print.html"), renderPrintSheet(cards), "utf8");
    await writeFile(join(output, "manifest.json.tmp"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    await rename(join(output, "manifest.json.tmp"), join(output, "manifest.json"));
    return manifest;
  } catch (error) {
    await rm(output, { recursive: true, force: true });
    throw error;
  }
}

export async function readFloorSnapshot(path) {
  return JSON.parse((await readFile(path, "utf8")).replace(/^\uFEFF/, ""));
}
