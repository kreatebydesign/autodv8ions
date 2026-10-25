import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildGmailSendFingerprint,
  isRecentDuplicateGmailSend,
} from "./gmail-send-idempotency";

describe("gmail send idempotency", () => {
  it("builds stable fingerprints", () => {
    const a = buildGmailSendFingerprint({
      jobId: "job-1",
      threadId: "t-1",
      subject: "Hello",
      body: "Body text",
    });
    const b = buildGmailSendFingerprint({
      jobId: "job-1",
      threadId: "t-1",
      subject: "hello",
      body: "Body   text",
    });
    assert.equal(a, b);
  });

  it("detects recent duplicate attempts", () => {
    const fp = buildGmailSendFingerprint({
      jobId: "job-1",
      threadId: null,
      subject: "Hi",
      body: "Test",
    });
    assert.equal(
      isRecentDuplicateGmailSend({
        fingerprint: fp,
        lastFingerprint: fp,
        lastSentAtMs: Date.now() - 5_000,
      }),
      true,
    );
    assert.equal(
      isRecentDuplicateGmailSend({
        fingerprint: fp,
        lastFingerprint: fp,
        lastSentAtMs: Date.now() - 300_000,
      }),
      false,
    );
  });
});
