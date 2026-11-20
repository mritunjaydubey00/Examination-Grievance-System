import {
  DEPARTMENT_BRANCHES,
  DEPARTMENT_CODES,
  BRANCH_CODES,
} from "../src/department.js";

function sql(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

const departmentRows = Object.keys(DEPARTMENT_BRANCHES).map((name) =>
  `  (${sql(DEPARTMENT_CODES[name])}, ${sql(DEPARTMENT_CODES[name])}, ${sql(name)}, true)`,
);

const branchRows = [];
for (const [department, branches] of Object.entries(DEPARTMENT_BRANCHES)) {
  for (const branch of branches) {
    branchRows.push(
      `  (${sql(BRANCH_CODES[branch])}, ${sql(DEPARTMENT_CODES[department])}, ${sql(BRANCH_CODES[branch])}, ${sql(branch)}, true)`,
    );
  }
}

console.log(`insert into public.departments (id, code, name, is_active)
values
${departmentRows.join(",\n")}
on conflict (id) do update set code = excluded.code, name = excluded.name, is_active = excluded.is_active;

insert into public.branches (id, department_id, code, name, is_active)
values
${branchRows.join(",\n")}
on conflict (id) do update set department_id = excluded.department_id, code = excluded.code, name = excluded.name, is_active = excluded.is_active;
`);
