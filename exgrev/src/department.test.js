import test from "node:test";
import assert from "node:assert/strict";
import {
  DEPARTMENT_BRANCHES,
  DEPARTMENT_CODES,
  BRANCH_CODES,
  getAllDepartments,
  getBranches,
  getDepartmentByCode,
  getDepartmentLabel,
  isValidDepartment,
  isValidBranch,
} from "./department.js";

test("department model helpers preserve the raw department and branch data", () => {
  assert.equal(getAllDepartments().length, 11);
  assert.deepEqual(
    getBranches("Department of Internet of Things(EE)"),
    ["Electrical and Computer Engineering", " Internet of Things (IoT)"],
  );
  assert.equal(getDepartmentByCode("CSE"), "Department of Computer Science & Engineering");
  assert.equal(getDepartmentLabel("CSE"), "Department of Computer Science & Engineering");
  assert.equal(isValidDepartment("CSE"), true);
  assert.equal(isValidBranch("CSE", "Computer Science & Engineering"), true);
});

test("department and branch codes cover every raw data value", () => {
  for (const [department, branches] of Object.entries(DEPARTMENT_BRANCHES)) {
    assert.ok(DEPARTMENT_CODES[department], `Missing department code: ${department}`);
    for (const branch of branches) {
      assert.ok(BRANCH_CODES[branch], `Missing branch code: ${branch}`);
    }
  }
});
