import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getNyMonthPeriodBounds } from "./ny-month-period";

describe("getNyMonthPeriodBounds", () => {
  it("uses May when UTC instant is still May 31 in New York", () => {
    const bounds = getNyMonthPeriodBounds(new Date("2024-06-01T03:30:00.000Z"));
    assert.equal(bounds.periodLabel, "May 2024");
    assert.equal(bounds.month, 5);
    assert.equal(bounds.year, 2024);
    assert.equal(bounds.periodStartIso, "2024-05-01T04:00:00.000Z");
    assert.equal(bounds.periodEndIso, "2024-06-01T04:00:00.000Z");
  });

  it("uses July when New York has entered the new month", () => {
    const bounds = getNyMonthPeriodBounds(new Date("2024-07-01T08:00:00.000Z"));
    assert.equal(bounds.periodLabel, "July 2024");
    assert.equal(bounds.month, 7);
    assert.equal(bounds.periodStartIso, "2024-07-01T04:00:00.000Z");
    assert.equal(bounds.periodEndIso, "2024-08-01T04:00:00.000Z");
  });
});
