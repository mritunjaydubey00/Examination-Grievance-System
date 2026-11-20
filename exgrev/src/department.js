export const DEPARTMENT_BRANCHES = {
  "School of Civil Engineering": ["Civil Engineering"],
  "School of Mechanical Engineering": ["Mechanical Engineering"],
  "School of Electrical Engineering": ["Electrical Engineering"],
  "Department of Computer Science & Engineering": [
    "Computer Science & Engineering",
    "Computer Science & Design",
  ],
  "School of Information Technology": ["Information Technology"],
  "School of Electronics & Communication Engineering": [
    "Electronics Engineering",
    "Electronics & Telecommunications Engineering",
  ],
  "Centre for Artificial Intelligence": [
    "Information Technology (Artificial Intelligence and Robotics)",
    "Artificial Intelligence & Machine Learning",
    "Artificial Intelligence & Data Science",
    "Artificial Intelligence",
  ],
  "Department of Internet of Things(EE)": [
    "Electrical and Computer Engineering",
    " Internet of Things (IoT)",
  ],
  "Centre for Computer Science and Technology": [
    "Computer Science and Business Systems",
    "Computer Science and Technology",
  ],
  "School of Engineering Mathematics & Computing": ["Mathematics & Computing"],
  "School of Chemical Engineering": ["Chemical Engineering"],
};

export const DEPARTMENT_CODES = {
  "School of Civil Engineering": "CV",
  "School of Mechanical Engineering": "MECH",
  "School of Electrical Engineering": "EL",
  "Department of Computer Science & Engineering": "CSE",
  "School of Information Technology": "IT",
  "School of Electronics & Communication Engineering": "ECE",
  "Centre for Artificial Intelligence": "AI",
  "Department of Internet of Things(EE)": "IOT",
  "Centre for Computer Science and Technology": "CCST",
  "School of Engineering Mathematics & Computing": "MAC",
  "School of Chemical Engineering": "CHE",
};

export const BRANCH_CODES = {
  "Civil Engineering": "CV",
  "Mechanical Engineering": "MECH",
  "Electrical Engineering": "EL",
  "Computer Science & Engineering": "CSE",
  "Computer Science & Design": "CSD",
  "Information Technology": "IT",
  "Electronics Engineering": "EE",
  "Electronics & Telecommunications Engineering": "ET",
  "Information Technology (Artificial Intelligence and Robotics)": "ITAIR",
  "Artificial Intelligence & Machine Learning": "AIML",
  "Artificial Intelligence & Data Science": "AIDS",
  "Artificial Intelligence": "AI",
  "Electrical and Computer Engineering": "ECE",
  " Internet of Things (IoT)": "IOT",
  "Computer Science and Business Systems": "CSBS",
  "Computer Science and Technology": "CST",
  "Mathematics & Computing": "MAC",
  "Chemical Engineering": "CHE",
};

export const ENROLLMENT_DEPARTMENT_CODES = {
  CB: "CSE",
};

export function getAllDepartments() {
  return Object.keys(DEPARTMENT_BRANCHES);
}

export function getBranches(department) {
  if (!Object.prototype.hasOwnProperty.call(DEPARTMENT_BRANCHES, department)) {
    return [];
  }
  return [...DEPARTMENT_BRANCHES[department]];
}

export function getAllBranches() {
  return getAllDepartments().flatMap((department) =>
    getBranches(department).map((branch) => ({
      department,
      branch,
      departmentCode: DEPARTMENT_CODES[department],
      branchCode: BRANCH_CODES[branch],
    })),
  );
}

export function getDepartmentByCode(code) {
  const normalized = String(code || "").trim().toUpperCase();
  return getAllDepartments().find(
    (department) => DEPARTMENT_CODES[department] === normalized,
  ) || null;
}

export function getDepartmentLabel(value) {
  if (!value) return "Unknown";
  const direct = getAllDepartments().find(
    (department) => department === String(value).trim(),
  );
  if (direct) return direct;
  const byCode = getDepartmentByCode(value);
  return byCode || "Unknown";
}

export function isValidDepartment(value) {
  const normalized = String(value || "").trim();
  return getAllDepartments().includes(normalized) ||
    getAllDepartments().some(
      (department) => DEPARTMENT_CODES[department] === normalized.toUpperCase(),
    );
}

export function isValidBranch(department, branch) {
  const normalizedDepartment = getDepartmentByCode(department) ||
    (getAllDepartments().includes(department) ? department : null);
  return normalizedDepartment
    ? getBranches(normalizedDepartment).includes(String(branch || "").trim())
    : false;
}

export function getDepartmentBranchOptions() {
  return getAllDepartments().map((department) => ({
    department,
    departmentCode: DEPARTMENT_CODES[department],
    branches: getBranches(department).map((branch) => ({
      branch,
      branchCode: BRANCH_CODES[branch],
    })),
  }));
}
