import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateReplyThreadForJob } from "./job-gmail-reply-guard";

describe("gmail attachment authorization guard", () => {
  it("rejects cross-thread access when job link differs", () => {
    const result = validateReplyThreadForJob({
      requestedThreadId: "thread-a",
      linkedThreadId: "thread-b",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "gmail_thread_not_linked");
  });

  it("allows access when thread matches job link", () => {
    const result = validateReplyThreadForJob({
      requestedThreadId: "thread-a",
      linkedThreadId: "thread-a",
    });
    assert.equal(result.ok, true);
  });
});
