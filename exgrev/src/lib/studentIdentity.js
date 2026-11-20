import { BRANCH_MAPPING } from "../data/Branch-Mapping.js";

export function parseStudentRollNumber(rollNumber) {
  const normalized = String(rollNumber || "").trim().toUpperCase();
  if (!/^[A-Z]{2}[A-Z]{2}\d{2}[A-Z]\d+/.test(normalized)) {
    return { branchCode: "", branchName: "", admissionYear: null };
  }

  const branchCode = normalized.slice(2, 4);
  const twoDigitYear = normalized.slice(4, 6);
  const yearNumber = Number(twoDigitYear);

  return {
    branchCode,
    branchName: BRANCH_MAPPING[branchCode] || "",
    admissionYear: Number.isFinite(yearNumber)
      ? 2000 + yearNumber
      : null,
  };
}
