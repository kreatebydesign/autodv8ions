import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatJobNumber } from "./job-display";

describe("formatJobNumber", () => {
  it("formats a stable short reference", () => {
    const id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    assert.equal(formatJobNumber(id), "JOB-A1B2C3D4");
  });
});
