import assert from "node:assert/strict";
import test from "node:test";

import {
  createCheckInGateway,
  formatFloorLabel,
  parseResolveQrResponse,
  parseSubmitCheckInResponse,
} from "../src/features/crowd-report/gateway.ts";

const validQr = "00000000-0000-4000-8000-000000000001";

test("formatFloorLabel adds prefix only when missing", () => {
  assert.equal(formatFloorLabel("1"), "ชั้น 1");
  assert.equal(formatFloorLabel("ชั้น 3"), "ชั้น 3");
  assert.equal(formatFloorLabel(" M "), "ชั้น M");
});

test("resolveQr rejects non-UUID payloads locally without calling fetch", async () => {
  let called = false;
  const gateway = createCheckInGateway(async () => {
    called = true;
    throw new Error("should not fetch");
  });

  const result = await gateway.resolveQr(
    "https://example.com/not-a-floor-qr",
    new AbortController().signal,
  );
  assert.equal(called, false);
  assert.equal(result.kind, "rejected");
  assert.equal(result.reason, "invalid_qr");
});

test("resolveQr sends POST /api/checkins/resolve and maps floor context", async () => {
  let captured;
  const gateway = createCheckInGateway(async (url, init) => {
    captured = { url, init };
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          floor_ref: validQr,
          location: {
            id: 7,
            building: "N7",
            name: "อาคารเรียนรวม 2",
            image_url: "https://example.com/n7.png",
          },
          floor: { id: 31, name: "3" },
        },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  });

  const result = await gateway.resolveQr(` ${validQr} `, new AbortController().signal);
  assert.equal(captured.url, "/api/checkins/resolve");
  assert.equal(captured.init.method, "POST");
  assert.equal(captured.init.credentials, "same-origin");
  assert.deepEqual(JSON.parse(captured.init.body), { qr: validQr });
  assert.deepEqual(result, {
    kind: "resolved",
    floor: {
      floorRef: validQr,
      context: {
        buildingName: "อาคารเรียนรวม 2",
        floorLabel: "ชั้น 3",
        imageUrl: "https://example.com/n7.png",
      },
    },
  });
});

test("resolveQr maps 401, 404 invalid_qr, 503 and network failures", async () => {
  assert.deepEqual(
    parseResolveQrResponse(401, {
      success: false,
      code: "unauthorized",
      error: "กรุณาเข้าสู่ระบบ",
    }),
    { kind: "rejected", reason: "auth", message: "กรุณาเข้าสู่ระบบ" },
  );
  assert.deepEqual(
    parseResolveQrResponse(404, {
      success: false,
      code: "invalid_qr",
      error: "ไม่พบ QR",
    }),
    { kind: "rejected", reason: "invalid_qr", message: "ไม่พบ QR" },
  );
  assert.deepEqual(
    parseResolveQrResponse(503, {
      success: false,
      code: "unavailable",
      error: "ระบบไม่พร้อม",
    }),
    { kind: "rejected", reason: "network", message: "ระบบไม่พร้อม" },
  );

  const offlineGateway = createCheckInGateway(async () => {
    throw new TypeError("network down");
  });
  assert.deepEqual(
    await offlineGateway.resolveQr(validQr, new AbortController().signal),
    { kind: "rejected", reason: "network" },
  );
});

test("resolveQr rethrows AbortError when aborted", async () => {
  const controller = new AbortController();
  const gateway = createCheckInGateway(async () => {
    controller.abort();
    throw new DOMException("Aborted", "AbortError");
  });

  await assert.rejects(
    gateway.resolveQr(validQr, controller.signal),
    { name: "AbortError" },
  );
});

test("submitCheckIn posts BE-008 payload and maps 201 recorded response", async () => {
  let captured;
  const gateway = createCheckInGateway(async (url, init) => {
    captured = { url, init };
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: 99,
          location: { id: 7, building: "N7", name: "อาคารเรียนรวม 2" },
          floor: { id: 31, name: "2" },
          crowd_level: 4,
          created_at: "2026-11-20T10:00:00.000Z",
          next_eligible_at: "2026-11-20T10:30:00.000Z",
        },
      }),
      { status: 201, headers: { "content-type": "application/json" } },
    );
  });

  const result = await gateway.submitCheckIn(
    {
      floorRef: validQr,
      level: 4,
      gps: {
        latitude: 13.65,
        longitude: 100.49,
        accuracyMeters: 15,
        capturedAt: "2026-11-20T09:59:55.000Z",
      },
    },
    new AbortController().signal,
  );

  assert.equal(captured.url, "/api/checkins");
  assert.equal(captured.init.method, "POST");
  assert.deepEqual(JSON.parse(captured.init.body), {
    qr: validQr,
    crowd_level: 4,
    latitude: 13.65,
    longitude: 100.49,
    accuracy_meters: 15,
  });
  assert.deepEqual(result, {
    kind: "recorded",
    record: {
      buildingName: "อาคารเรียนรวม 2",
      floorLabel: "ชั้น 2",
      level: 4,
      recordedAt: "2026-11-20T10:00:00.000Z",
    },
  });
});

test("submitCheckIn maps BE-008 error codes accurately", () => {
  const cooldown = parseSubmitCheckInResponse(409, {
    success: false,
    code: "cooldown",
    error: "รายงานชั้นนี้ไปแล้ว",
    next_eligible_at: "2026-11-20T03:30:00.000Z",
  });
  assert.equal(cooldown.kind, "rejected");
  assert.equal(cooldown.reason, "cooldown");
  assert.match(cooldown.message, /10:30 น\./);

  const outOfRange = parseSubmitCheckInResponse(422, {
    success: false,
    code: "out_of_range",
    error: "อยู่ไกลเกินไป",
    distance_meters: 245,
  });
  assert.equal(outOfRange.kind, "rejected");
  assert.equal(outOfRange.reason, "out_of_range");
  assert.match(outOfRange.message, /245 เมตร/);

  assert.deepEqual(
    parseSubmitCheckInResponse(422, {
      success: false,
      code: "gps_inaccurate",
      error: "ตำแหน่ง GPS ยังไม่แม่นพอ",
    }),
    {
      kind: "rejected",
      reason: "gps_unavailable",
      message: "ตำแหน่ง GPS ยังไม่แม่นพอ",
    },
  );

  assert.deepEqual(
    parseSubmitCheckInResponse(404, {
      success: false,
      code: "invalid_qr",
      error: "QR ใช้ไม่ได้",
    }),
    { kind: "rejected", reason: "invalid_qr", message: "QR ใช้ไม่ได้" },
  );

  assert.deepEqual(
    parseSubmitCheckInResponse(401, {
      success: false,
      code: "unauthorized",
      error: "กรุณาเข้าสู่ระบบ",
    }),
    { kind: "rejected", reason: "auth", message: "กรุณาเข้าสู่ระบบ" },
  );

  assert.deepEqual(
    parseSubmitCheckInResponse(503, {
      success: false,
      code: "unavailable",
      error: "ระบบขัดข้อง",
    }),
    { kind: "rejected", reason: "network", message: "ระบบขัดข้อง" },
  );
});
