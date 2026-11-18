import assert from "node:assert/strict";
import test from "node:test";

import {
  formatVoucherDate,
  formatVoucherDateTime,
  getVoucherDetailView,
  getVoucherDisplayStatus,
  getVoucherStatusLabel,
} from "../src/features/rewards/vouchers.ts";

const available = { status: "available", usedAt: null };
const withQr = { hasQr: true, hasUseAction: true };

test("status follows the caller input", () => {
  assert.equal(getVoucherDisplayStatus(available), "available");
  assert.equal(
    getVoucherDisplayStatus({ status: "used", usedAt: "2026-11-18T03:00:00Z" }),
    "used",
  );
  assert.equal(
    getVoucherDisplayStatus({ status: "expired", usedAt: null }),
    "expired",
  );
});

test("used_at wins over an available or expired status", () => {
  for (const status of ["available", "expired"]) {
    assert.equal(
      getVoucherDisplayStatus({ status, usedAt: "2026-11-18T03:00:00Z" }),
      "used",
    );
  }
});

test("a used status without used_at is still used", () => {
  assert.equal(getVoucherDisplayStatus({ status: "used", usedAt: null }), "used");
});

test("an unknown status is never shown as ready", () => {
  for (const status of ["active", "redeemable", undefined]) {
    const view = getVoucherDetailView({ status, usedAt: null }, withQr);
    assert.equal(view.status, "unavailable");
    assert.equal(view.showQr, false);
    assert.equal(view.showUseAction, false);
    assert.equal(view.showQrPending, false);
  }
});

test("each status has its own label", () => {
  assert.equal(getVoucherStatusLabel("available"), "พร้อมใช้");
  assert.equal(getVoucherStatusLabel("used"), "ใช้แล้ว");
  assert.equal(getVoucherStatusLabel("expired"), "หมดอายุ");
  assert.equal(getVoucherStatusLabel("unavailable"), "ใช้ไม่ได้");
});

test("a ready voucher shows the caller QR instead of the use action", () => {
  const view = getVoucherDetailView(available, withQr);
  assert.equal(view.showQr, true);
  assert.equal(view.showUseAction, false);
  assert.equal(view.showQrPending, false);
  assert.equal(view.notice, null);
});

test("a ready voucher without QR offers the caller action", () => {
  const view = getVoucherDetailView(available, {
    hasQr: false,
    hasUseAction: true,
  });
  assert.equal(view.showQr, false);
  assert.equal(view.showUseAction, true);
  assert.equal(view.showQrPending, false);
});

test("a ready voucher without QR or action reports that QR is not ready", () => {
  const view = getVoucherDetailView(available, {
    hasQr: false,
    hasUseAction: false,
  });
  assert.equal(view.showQr, false);
  assert.equal(view.showUseAction, false);
  assert.equal(view.showQrPending, true);
});

test("used and expired vouchers close QR and action even when both are passed", () => {
  for (const voucher of [
    { status: "used", usedAt: "2026-11-18T03:00:00Z" },
    { status: "available", usedAt: "2026-11-18T03:00:00Z" },
    { status: "expired", usedAt: null },
  ]) {
    const view = getVoucherDetailView(voucher, withQr);
    assert.equal(view.showQr, false);
    assert.equal(view.showUseAction, false);
    assert.equal(view.showQrPending, false);
    assert.notEqual(view.notice, null);
  }
});

test("dates use the Bangkok day and Buddhist year", () => {
  assert.equal(formatVoucherDate("2026-11-18T17:30:00Z"), "19 พ.ย. 2569");
  assert.equal(
    formatVoucherDateTime("2026-11-18T17:30:00Z"),
    "19 พ.ย. 2569 00:30 น.",
  );
});

test("invalid dates fall back without throwing", () => {
  assert.equal(formatVoucherDate("not-a-date"), "ไม่ระบุ");
  assert.equal(formatVoucherDateTime("not-a-date"), "ไม่ระบุ");
});
