export const ACADEMIC_YEAR_CONFIG = {
  academicSessionStartsInMonth: 7,
  programLengthYears: 4,
};

export const BRANCH_CODE_MAPPING = {
  CB: "Computer Science and Business Systems",
  CS: "Computer Science",
  IT: "Information Technology",
  EC: "Electronics and Communication",
  EE: "Electrical",
  ME: "Mechanical",
  CE: "Civil",
  BT: "Biotechnology",
};

export function getAdmissionYear(enrollmentNo) {
  if (typeof enrollmentNo !== "string" || enrollmentNo.length < 6) return null;
  const digits = enrollmentNo.slice(4, 6);
  if (!/^\d{2}$/.test(digits)) return null;
  return 2000 + Number(digits);
}

export function getStudyYear(enrollmentNo, today = new Date()) {
  const admissionYear = getAdmissionYear(enrollmentNo);
  if (!admissionYear) return "Unknown";
  const academicStartMonth = ACADEMIC_YEAR_CONFIG.academicSessionStartsInMonth;
  const currentSessionYear =
    today.getMonth() + 1 >= academicStartMonth
      ? today.getFullYear()
      : today.getFullYear() - 1;
  const studyYear = currentSessionYear - admissionYear + 1;
  if (studyYear <= 0) return "Not yet admitted";
  if (studyYear > ACADEMIC_YEAR_CONFIG.programLengthYears) return "Passed out";
  return `${studyYear}${studyYear === 1 ? "st" : studyYear === 2 ? "nd" : studyYear === 3 ? "rd" : "th"} year`;
}

export function getBranchFromEnrollment(enrollmentNo) {
  if (typeof enrollmentNo !== "string" || enrollmentNo.length < 4) return null;
  const code = enrollmentNo.slice(2, 4).toUpperCase();
  return BRANCH_CODE_MAPPING[code] || null;
}
