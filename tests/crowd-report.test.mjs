import assert from "node:assert/strict";
import test from "node:test";

import {
  crowdLevels,
  decideSubmit,
  formatRecordedAt,
  getCrowdLevelLabel,
  getCrowdReportView,
  getErrorCopy,
  isCrowdLevel,
} from "../src/features/crowd-report/crowd-report.ts";

const errorReasons = [
  "gps_denied",
  "gps_unavailable",
  "out_of_range",
  "invalid_qr",
  "cooldown",
  "auth",
  "network",
];

test("offers exactly levels 1 to 5 with end captions", () => {
  assert.deepEqual(
    crowdLevels.map((option) => option.value),
    [1, 2, 3, 4, 5],
  );
  assert.equal(crowdLevels[0].caption, "ว่าง");
  assert.equal(crowdLevels[4].caption, "แน่นมาก");
  assert.equal(getCrowdLevelLabel(3), "ปานกลาง");
});

test("only integers 1 to 5 are crowd levels", () => {
  for (const value of [1, 2, 3, 4, 5]) {
    assert.equal(isCrowdLevel(value), true);
  }
  for (const value of [0, 6, 2.5, "3", null, undefined]) {
    assert.equal(isCrowdLevel(value), false);
  }
});

test("idle allows submitting without an error", () => {
  assert.deepEqual(getCrowdReportView({ status: "idle" }), {
    pending: false,
    locked: false,
    canSubmit: true,
    submitLabel: "เช็คอินที่นี่",
    error: null,
  });
});

test("pending locks the form and blocks a second submit", () => {
  const view = getCrowdReportView({ status: "pending" });
  assert.equal(view.pending, true);
  assert.equal(view.locked, true);
  assert.equal(view.canSubmit, false);
  assert.deepEqual(decideSubmit(3, { status: "pending" }), {
    type: "blocked",
  });
});

test("success locks the form", () => {
  const submission = {
    status: "success",
    record: {
      buildingName: "LX",
      floorLabel: "ชั้น 3",
      level: 2,
      recordedAt: "2026-10-19T14:45:00.000Z",
    },
  };
  const view = getCrowdReportView(submission);
  assert.equal(view.locked, true);
  assert.equal(view.canSubmit, false);
  assert.deepEqual(decideSubmit(2, submission), { type: "blocked" });
});

test("missing level is invalid and never submits", () => {
  assert.deepEqual(decideSubmit(null, { status: "idle" }), {
    type: "invalid",
  });
});

test("a chosen level submits that level", () => {
  assert.deepEqual(decideSubmit(4, { status: "idle" }), {
    type: "submit",
    level: 4,
  });
});

test("every error reason has its own copy and keeps the form editable", () => {
  const titles = new Set();
  for (const reason of errorReasons) {
    const view = getCrowdReportView({ status: "error", reason });
    assert.equal(view.locked, false);
    assert.equal(view.pending, false);
    assert.ok(view.error);
    assert.equal(view.error.title, getErrorCopy(reason).title);
    titles.add(view.error.title);
  }
  assert.equal(titles.size, errorReasons.length);
});

test("retryable errors resubmit the kept level", () => {
  for (const reason of [
    "gps_denied",
    "gps_unavailable",
    "out_of_range",
    "network",
  ]) {
    const submission = { status: "error", reason };
    const view = getCrowdReportView(submission);
    assert.equal(view.canSubmit, true);
    assert.equal(view.submitLabel, "ลองอีกครั้ง");
    assert.deepEqual(decideSubmit(5, submission), {
      type: "submit",
      level: 5,
    });
  }
});

test("non-retryable errors block submitting", () => {
  for (const reason of ["invalid_qr", "cooldown", "auth"]) {
    const submission = { status: "error", reason };
    assert.equal(getCrowdReportView(submission).canSubmit, false);
    assert.deepEqual(decideSubmit(1, submission), { type: "blocked" });
  }
});

test("caller message replaces the default error description", () => {
  const view = getCrowdReportView({
    status: "error",
    reason: "cooldown",
    message: "รายงานได้อีกครั้งในอีก 10 นาที",
  });
  assert.equal(view.error.description, "รายงานได้อีกครั้งในอีก 10 นาที");
  assert.equal(view.error.title, getErrorCopy("cooldown").title);
});

test("formats the recorded time in Thai Buddhist calendar, Bangkok time", () => {
  assert.equal(
    formatRecordedAt("2026-10-19T14:45:00.000Z"),
    "วันที่ 19 ต.ค. 2569 เวลา 21:45 น.",
  );
});

test("invalid recorded time is not shown", () => {
  assert.equal(formatRecordedAt("not-a-date"), null);
});
