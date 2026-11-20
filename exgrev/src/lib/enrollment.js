import {
  ACADEMIC_YEAR_START_MONTH,
  ENROLLMENT_BRANCH_CODES,
  PROGRAM_LENGTH_YEARS,
} from "../config/enrollment.js";

export function getAdmissionYear(enrollmentNo) {
  if (typeof enrollmentNo !== "string") return null;
  const match = enrollmentNo.trim().match(/^[A-Za-z0-9]{4}(\d{2})/);
  return match ? 2000 + Number(match[1]) : null;
}

export function getStudyYear(enrollmentNo, today = new Date()) {
  const admissionYear = getAdmissionYear(enrollmentNo);
  if (!admissionYear || !(today instanceof Date) || Number.isNaN(today.getTime())) {
    return null;
  }

  const academicYear =
    today.getFullYear() -
    (today.getMonth() < ACADEMIC_YEAR_START_MONTH ? 1 : 0);
  const studyYear = academicYear - admissionYear + 1;
  if (studyYear < 1) return null;
  if (studyYear > PROGRAM_LENGTH_YEARS) return "Passed out";
  return studyYear;
}

export function getAdmissionYearForStudyYear(studyYear, today = new Date()) {
  if (
    !Number.isInteger(studyYear) ||
    studyYear < 1 ||
    studyYear > PROGRAM_LENGTH_YEARS ||
    !(today instanceof Date) ||
    Number.isNaN(today.getTime())
  ) {
    return null;
  }

  const academicYear =
    today.getFullYear() -
    (today.getMonth() < ACADEMIC_YEAR_START_MONTH ? 1 : 0);
  return academicYear - studyYear + 1;
}

export function getStudyYearFilter(yearFilter, today = new Date()) {
  if (yearFilter === "unknown") return { type: "unknown" };
  if (yearFilter === "passed") {
    const academicYear =
      today.getFullYear() -
      (today.getMonth() < ACADEMIC_YEAR_START_MONTH ? 1 : 0);
    return {
      type: "before",
      year: academicYear - PROGRAM_LENGTH_YEARS + 1,
    };
  }
  if (yearFilter.startsWith("admission:")) {
    const year = Number(yearFilter.slice("admission:".length));
    return Number.isInteger(year) ? { type: "admission", year } : null;
  }
  if (yearFilter.startsWith("study:")) {
    const studyYear = Number(yearFilter.slice("study:".length));
    const year = getAdmissionYearForStudyYear(studyYear, today);
    return year ? { type: "admission", year } : null;
  }
  return null;
}

export function getEnrollmentBranch(enrollmentNo, storedBranch = "") {
  if (typeof storedBranch === "string" && storedBranch.trim()) {
    return storedBranch.trim();
  }
  if (typeof enrollmentNo !== "string") return null;
  const branchCode = enrollmentNo.trim().slice(2, 4).toUpperCase();
  return ENROLLMENT_BRANCH_CODES[branchCode] || null;
}

export function formatStudyYear(studyYear) {
  if (studyYear === "Passed out") return studyYear;
  if (!Number.isInteger(studyYear)) return "Unknown";
  const suffix =
    studyYear % 100 >= 11 && studyYear % 100 <= 13
      ? "th"
      : studyYear % 10 === 1
        ? "st"
        : studyYear % 10 === 2
          ? "nd"
          : studyYear % 10 === 3
            ? "rd"
            : "th";
  return `${studyYear}${suffix} year`;
}
