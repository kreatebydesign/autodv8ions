import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeConversationMessages } from "./conversation-merge";
import type { ParsedGmailMessage } from "@/lib/google/gmail-message";
import type { JobOutboundEmail } from "./outbound-email";

function gmailMsg(
  partial: Partial<ParsedGmailMessage> & { plainTextBody: string },
): ParsedGmailMessage {
  return {
    gmailMessageId: partial.gmailMessageId || "g1",
    threadId: "t1",
    direction: partial.direction || "outgoing",
    from: "sales@autodv8ions.com",
    to: "customer@example.com",
    cc: "",
    subject: partial.subject || "Hello",
    sentAt: partial.sentAt || "2026-01-01T12:00:00.000Z",
    messageIdHeader: null,
    inReplyTo: null,
    references: null,
    plainTextBody: partial.plainTextBody,
    htmlBody: null,
    unread: false,
    hasAttachments: false,
  };
}

describe("mergeConversationMessages", () => {
  it("merges and sorts by sent time", () => {
    const gmail = [
      gmailMsg({
        gmailMessageId: "g2",
        sentAt: "2026-01-02T12:00:00.000Z",
        plainTextBody: "Reply",
        direction: "incoming",
      }),
    ];
    const outbound: JobOutboundEmail[] = [
      {
        id: "o1",
        job_id: "job-1",
        to_email: "customer@example.com",
        subject: "First",
        body_text: "First contact",
        provider: "resend",
        resend_message_id: null,
        content_fingerprint: null,
        sent_at: "2026-01-01T10:00:00.000Z",
      },
    ];

    const merged = mergeConversationMessages(gmail, outbound);
    assert.equal(merged.length, 2);
    assert.equal(merged[0].source, "resend");
    assert.equal(merged[1].source, "gmail");
  });

  it("drops local outbound when gmail already has same body", () => {
    const body = "Same message body";
    const gmail = [gmailMsg({ plainTextBody: body, direction: "outgoing" })];
    const outbound: JobOutboundEmail[] = [
      {
        id: "o1",
        job_id: "job-1",
        to_email: "customer@example.com",
        subject: "First",
        body_text: body,
        provider: "resend",
        resend_message_id: null,
        content_fingerprint: null,
        sent_at: "2026-01-01T10:00:00.000Z",
      },
    ];

    const merged = mergeConversationMessages(gmail, outbound);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].source, "gmail");
  });
});
