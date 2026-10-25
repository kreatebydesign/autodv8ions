import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  OUTBOUND_DUPLICATE_SEND_WINDOW_MS,
  isWithinDuplicateSendWindow,
} from "./outbound-email";

describe("outbound duplicate send window", () => {
  it("blocks only inside the short accidental-duplicate window", () => {
    const now = Date.UTC(2026, 0, 15, 12, 0, 0);
    const recent = new Date(now - 60_000).toISOString();
    const older = new Date(
      now - OUTBOUND_DUPLICATE_SEND_WINDOW_MS - 1_000,
    ).toISOString();

    assert.equal(isWithinDuplicateSendWindow(recent, now), true);
    assert.equal(isWithinDuplicateSendWindow(older, now), false);
  });
});
