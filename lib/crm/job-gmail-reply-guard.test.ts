import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateReplyThreadForJob } from "./job-gmail-reply-guard";

describe("validateReplyThreadForJob", () => {
  it("rejects replies when the job has no linked Gmail thread", () => {
    const result = validateReplyThreadForJob({
      requestedThreadId: "thread-a",
      linkedThreadId: null,
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "gmail_thread_not_linked");
    }
  });

  it("rejects replies to a different thread when a primary link exists", () => {
    const result = validateReplyThreadForJob({
      requestedThreadId: "thread-other",
      linkedThreadId: "thread-primary",
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "gmail_thread_not_linked");
    }
  });

  it("accepts replies that match the linked thread", () => {
    assert.deepEqual(
      validateReplyThreadForJob({
        requestedThreadId: "thread-primary",
        linkedThreadId: "thread-primary",
      }),
      { ok: true },
    );
  });
});
