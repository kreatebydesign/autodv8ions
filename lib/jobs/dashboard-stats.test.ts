import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getCompletedThisMonthBounds } from "./dashboard-stats";

describe("getCompletedThisMonthBounds", () => {
  it("matches NY calendar month bounds used by monthly snapshot", () => {
    const bounds = getCompletedThisMonthBounds(
      new Date("2024-06-01T03:30:00.000Z"),
    );
    assert.equal(bounds.periodStartIso, "2024-05-01T04:00:00.000Z");
    assert.equal(bounds.periodEndIso, "2024-06-01T04:00:00.000Z");
  });

  it("uses exclusive end at start of next NY month", () => {
    const bounds = getCompletedThisMonthBounds(
      new Date("2024-07-15T12:00:00.000Z"),
    );
    assert.equal(bounds.periodStartIso, "2024-07-01T04:00:00.000Z");
    assert.equal(bounds.periodEndIso, "2024-08-01T04:00:00.000Z");
  });
});
