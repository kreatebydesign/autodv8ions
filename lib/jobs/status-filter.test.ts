import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { statusesMatchingFilter } from "./status-filter";

describe("statusesMatchingFilter", () => {
  it("returns null for empty / all-statuses filter", () => {
    assert.equal(statusesMatchingFilter(null), null);
    assert.equal(statusesMatchingFilter(undefined), null);
    assert.equal(statusesMatchingFilter(""), null);
    assert.equal(statusesMatchingFilter("   "), null);
  });

  it("includes Scheduled when filtering Contacted", () => {
    assert.deepEqual(statusesMatchingFilter("Contacted"), [
      "Contacted",
      "Scheduled",
    ]);
  });

  it("keeps Scheduled filter exact", () => {
    assert.deepEqual(statusesMatchingFilter("Scheduled"), ["Scheduled"]);
  });

  it("keeps other status filters exact", () => {
    assert.deepEqual(statusesMatchingFilter("New"), ["New"]);
    assert.deepEqual(statusesMatchingFilter("In Shop"), ["In Shop"]);
    assert.deepEqual(statusesMatchingFilter("Ready for Pickup"), [
      "Ready for Pickup",
    ]);
    assert.deepEqual(statusesMatchingFilter("Completed"), ["Completed"]);
    assert.deepEqual(statusesMatchingFilter("Not Sold"), ["Not Sold"]);
  });
});
