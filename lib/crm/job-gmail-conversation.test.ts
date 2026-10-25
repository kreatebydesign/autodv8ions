import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildLinkEmailMismatchWarning,
  buildParticipationWarning,
  shouldExposeGmailThreadMessages,
} from "./job-gmail-conversation";
import type { JobGmailThreadLink } from "./job-gmail-thread";

function link(overrides: Partial<JobGmailThreadLink>): JobGmailThreadLink {
  return {
    id: "link-1",
    job_id: "job-1",
    gmail_thread_id: "thread-1",
    customer_email: "old@example.com",
    is_primary: true,
    link_source: "manual",
    linked_at: "2026-01-01T00:00:00.000Z",
    linked_by_admin: "admin@example.com",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("job gmail conversation helpers", () => {
  it("flags email mismatch without implying auto-unlink", () => {
    const warning = buildLinkEmailMismatchWarning(
      link({ customer_email: "old@example.com" }),
      "new@example.com",
    );
    assert.equal(warning?.code, "linked_email_mismatch");
    assert.match(warning?.message || "", /Review the link/i);
    assert.equal(
      buildLinkEmailMismatchWarning(
        link({ customer_email: "same@example.com" }),
        "same@example.com",
      ),
      null,
    );
  });

  it("hides gmail bodies when customer is not on the linked thread", () => {
    const participation = buildParticipationWarning(
      [{ from: "vendor@elsewhere.com", to: "sales@autodv8ions.com" }],
      "customer@example.com",
    );
    assert.equal(participation?.code, "linked_thread_participation");
    assert.equal(shouldExposeGmailThreadMessages(participation), false);
    assert.equal(
      shouldExposeGmailThreadMessages(
        buildLinkEmailMismatchWarning(
          link({ customer_email: "old@example.com" }),
          "new@example.com",
        ),
      ),
      true,
    );
  });

  it("allows exposure when customer participates", () => {
    assert.equal(
      buildParticipationWarning(
        [
          {
            from: "Customer <customer@example.com>",
            to: "sales@autodv8ions.com",
          },
        ],
        "customer@example.com",
      ),
      null,
    );
  });
});
