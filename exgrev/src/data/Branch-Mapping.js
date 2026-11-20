export const BRANCH_MAPPING = {
  CB: "Computer Science and Business Systems",
  CC: "Computer Science and Technology",
  CD: "Computer Science and Design",
  CE: "Civil Engineering",
  CG: "Computer Science and Engineering",
  CH: "Chemical Engineering",
  CS: "Computer Science and Engineering",
  EC: "Electronics and Communication Engineering",
  EE: "Electrical Engineering",
  EI: "Electronics Engineering",
  ET: "Electronics and Telecommunications Engineering",
  IT: "Information Technology",
  AI: "Artificial Intelligence",
  AM: "Artificial Intelligence and Machine Learning",
  AD: "Artificial Intelligence and Data Science",
  AR: "Artificial Intelligence and Robotics",
  MC: "Mathematics and Computing",
  ME: "Mechanical Engineering",
  IO: "Internet of Things",
  PE: "Electrical and Computer Engineering",
};

export const BRANCH_OPTIONS = Object.entries(BRANCH_MAPPING).map(
  ([code, name]) => ({ code, name }),
);
