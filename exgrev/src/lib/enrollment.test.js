import test from "node:test";
import assert from "node:assert/strict";
import {
  getAdmissionYear,
  getStudyYear,
  getBranchFromEnrollment,
} from "../config/enrollment.js";

test("derives admission year from enrollment positions 5-6", () => {
  assert.equal(getAdmissionYear("BTCB25O1116"), 2025);
});

test("returns null for invalid enrollment numbers", () => {
  assert.equal(getAdmissionYear(null), null);
  assert.equal(getAdmissionYear("BTCX"), null);
  assert.equal(getAdmissionYear("BTCBXTO1116"), null);
});

test("calculates academic study year", () => {
  assert.equal(getStudyYear("BTCB25O1116", new Date(2026, 10, 1)), "2nd year");
  assert.equal(getStudyYear("BTCB29O1116", new Date(2026, 10, 1)), "Not yet admitted");
  assert.equal(getStudyYear("BTCB20O1116", new Date(2026, 10, 1)), "Passed out");
});

test("derives known branch codes", () => {
  assert.equal(getBranchFromEnrollment("BTCB25O1116"), "Computer Science and Business Systems");
  assert.equal(getBranchFromEnrollment("BTXX25O1116"), null);
});
