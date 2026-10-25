import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyJobEmailSendOutcome,
  outboundContentFingerprint,
} from "./resend-job-email";

describe("classifyJobEmailSendOutcome", () => {
  it("reports send failure without implying delivery", () => {
    const result = classifyJobEmailSendOutcome({
      sendFailed: true,
      sendErrorMessage: "Provider rejected",
    });
    assert.equal(result.success, false);
    assert.equal(result.delivered, false);
    assert.equal(result.logged, false);
    assert.equal(result.error, "Provider rejected");
  });

  it("reports send and log success", () => {
    const result = classifyJobEmailSendOutcome({
      sendFailed: false,
      resendMessageId: "msg_123",
      logResult: { ok: true, id: "row-1" },
    });
    assert.equal(result.success, true);
    assert.equal(result.delivered, true);
    assert.equal(result.logged, true);
    assert.equal(result.resendMessageId, "msg_123");
    assert.equal(result.warning, null);
  });

  it("reports delivered but not logged with warning", () => {
    const result = classifyJobEmailSendOutcome({
      sendFailed: false,
      resendMessageId: "msg_456",
      logResult: { ok: false, code: "42P01", message: "missing table" },
    });
    assert.equal(result.success, true);
    assert.equal(result.delivered, true);
    assert.equal(result.logged, false);
    assert.match(result.warning || "", /do not send again/i);
  });
});

describe("outboundContentFingerprint", () => {
  it("is stable for equivalent whitespace", () => {
    const a = outboundContentFingerprint("Hi", "Hello   there");
    const b = outboundContentFingerprint("Hi", "Hello there");
    assert.equal(a, b);
  });
});
