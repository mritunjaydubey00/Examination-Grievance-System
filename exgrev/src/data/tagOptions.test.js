import assert from "node:assert/strict";
import test from "node:test";
import {
  categoryOptions,
  otherCategoryValue,
  problemTypeOptions,
} from "./tagOptions.js";

test("each displayed category has sub-categories and the other category is valid", () => {
  for (const category of categoryOptions) {
    assert.ok(problemTypeOptions[category]?.length);
  }
  assert.ok(categoryOptions.includes(otherCategoryValue));
  assert.ok(problemTypeOptions[otherCategoryValue].includes(otherCategoryValue));
});
