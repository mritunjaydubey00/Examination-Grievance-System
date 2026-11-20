import assert from "node:assert/strict";
import test from "node:test";
import {
  formatStudyYear,
  getAdmissionYear,
  getAdmissionYearForStudyYear,
  getEnrollmentBranch,
  getStudyYear,
  getStudyYearFilter,
} from "./enrollment.js";

test("reads the admission year from positions five and six", () => {
  assert.equal(getAdmissionYear("BTCB25O1116"), 2025);
  assert.equal(getAdmissionYear("invalid"), null);
  assert.equal(getAdmissionYear(null), null);
  assert.equal(getAdmissionYear("BTCB2XO1116"), null);
});

test("calculates study year at the August academic-year boundary", () => {
  assert.equal(getStudyYear("BTCB25O1116", new Date(2026, 10, 1)), 2);
  assert.equal(getStudyYear("BTCB25O1116", new Date(2026, 6, 31)), 1);
  assert.equal(getStudyYear("BTCB25O1116", new Date(2026, 7, 1)), 2);
  assert.equal(getStudyYear("BTCB20O1116", new Date(2026, 10, 1)), "Passed out");
  assert.equal(getStudyYear("BTCB30O1116", new Date(2026, 10, 1)), null);
});

test("converts study years to admission batches and formats labels", () => {
  const today = new Date(2026, 10, 1);
  assert.equal(getAdmissionYearForStudyYear(2, today), 2025);
  assert.equal(getAdmissionYearForStudyYear(5, today), null);
  assert.equal(formatStudyYear(1), "1st year");
  assert.equal(formatStudyYear(2), "2nd year");
  assert.equal(formatStudyYear(3), "3rd year");
  assert.equal(formatStudyYear("Passed out"), "Passed out");
  assert.equal(formatStudyYear(null), "Unknown");
});

test("builds admission-batch, study-year, passed-out, and unknown filters", () => {
  const today = new Date(2026, 10, 1);
  assert.deepEqual(getStudyYearFilter("study:1", today), {
    type: "admission",
    year: 2026,
  });
  assert.deepEqual(getStudyYearFilter("admission:2024", today), {
    type: "admission",
    year: 2024,
  });
  assert.deepEqual(getStudyYearFilter("passed", today), {
    type: "before",
    year: 2023,
  });
  assert.deepEqual(getStudyYearFilter("unknown", today), { type: "unknown" });
  assert.equal(getStudyYearFilter("study:5", today), null);
});

test("prefers the stored branch over an enrollment-code mapping", () => {
  assert.equal(
    getEnrollmentBranch("BTCB25O1116", "Computer Science and Design"),
    "Computer Science and Design",
  );
  assert.equal(
    getEnrollmentBranch("BTCB25O1116"),
    "Computer Science & Engineering",
  );
  assert.equal(getEnrollmentBranch("BTXX25O1116"), null);
});
