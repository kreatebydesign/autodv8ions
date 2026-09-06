import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCustomerReplyNotifications,
  buildEmailToJobMap,
  extractSenderEmail,
  formatNotificationBadgeCount,
  isIncomingFromKnownCustomer,
  messageLooksUnread,
  pickBestJobForEmail,
  truncatePreview,
  type JobEmailCandidate,
  type UnreadMessageCandidate,
} from "./gmail-notifications";

const mailbox = "sales@autodv8ions.com";

function job(
  overrides: Partial<JobEmailCandidate> & Pick<JobEmailCandidate, "jobId" | "customerEmail">,
): JobEmailCandidate {
  return {
    customerName: "Test Customer",
    status: "Contacted",
    updatedAt: "2026-01-02T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("gmail notification matching", () => {
  it("normalizes sender emails from From headers", () => {
    assert.equal(
      extractSenderEmail("Chris <Matt@KreateByDesign.com>"),
      "matt@kreatebydesign.com",
    );
    assert.equal(extractSenderEmail("not-an-email"), null);
  });

  it("matches only known customers and excludes outgoing mailbox mail", () => {
    const known = new Set(["customer@example.com"]);
    assert.deepEqual(
      isIncomingFromKnownCustomer({
        fromHeader: "Customer <customer@example.com>",
        mailboxEmail: mailbox,
        knownEmails: known,
      }),
      { senderEmail: "customer@example.com", matched: true },
    );
    assert.deepEqual(
      isIncomingFromKnownCustomer({
        fromHeader: "Vendor <vendor@elsewhere.com>",
        mailboxEmail: mailbox,
        knownEmails: known,
      }),
      { senderEmail: "vendor@elsewhere.com", matched: false },
    );
    assert.deepEqual(
      isIncomingFromKnownCustomer({
        fromHeader: `AutoDV8ions <${mailbox}>`,
        mailboxEmail: mailbox,
        knownEmails: known,
      }),
      { senderEmail: mailbox, matched: false },
    );
  });

  it("requires UNREAD label", () => {
    assert.equal(messageLooksUnread(["INBOX", "UNREAD"]), true);
    assert.equal(messageLooksUnread(["INBOX"]), false);
  });
});

describe("job matching for shared emails", () => {
  it("prefers the most recent active job over completed", () => {
    const best = pickBestJobForEmail([
      job({
        jobId: "old-active",
        customerEmail: "a@example.com",
        status: "Contacted",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
      job({
        jobId: "completed-new",
        customerEmail: "a@example.com",
        status: "Completed",
        updatedAt: "2026-03-01T00:00:00.000Z",
      }),
      job({
        jobId: "new-active",
        customerEmail: "a@example.com",
        status: "Scheduled",
        updatedAt: "2026-02-01T00:00:00.000Z",
      }),
    ]);
    assert.equal(best?.jobId, "new-active");
  });

  it("falls back to most recent closed job when none are active", () => {
    const best = pickBestJobForEmail([
      job({
        jobId: "older",
        customerEmail: "a@example.com",
        status: "Completed",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
      job({
        jobId: "newer",
        customerEmail: "a@example.com",
        status: "Not Sold",
        updatedAt: "2026-02-01T00:00:00.000Z",
      }),
    ]);
    assert.equal(best?.jobId, "newer");
  });
});

describe("notification build / badge / preview", () => {
  it("filters unknown senders, outgoing, and non-unread; dedupes threads; orders newest first", () => {
    const emailToJob = buildEmailToJobMap([
      job({
        jobId: "job-1",
        customerEmail: "customer@example.com",
        customerName: "Pat Customer",
        updatedAt: "2026-02-01T00:00:00.000Z",
      }),
    ]);

    const messages: UnreadMessageCandidate[] = [
      {
        gmailMessageId: "m1",
        gmailThreadId: "t1",
        fromHeader: "Pat <customer@example.com>",
        subject: "Older reply",
        snippet: "Older",
        receivedAt: "2026-01-01T10:00:00.000Z",
        labelIds: ["INBOX", "UNREAD"],
        mailboxEmail: mailbox,
      },
      {
        gmailMessageId: "m2",
        gmailThreadId: "t2",
        fromHeader: "Pat <customer@example.com>",
        subject: "Newer reply",
        snippet: "Newer body preview",
        receivedAt: "2026-01-02T10:00:00.000Z",
        labelIds: ["INBOX", "UNREAD"],
        mailboxEmail: mailbox,
      },
      {
        gmailMessageId: "m3",
        gmailThreadId: "t1",
        fromHeader: "Pat <customer@example.com>",
        subject: "Duplicate thread newer",
        snippet: "Dup",
        receivedAt: "2026-01-03T10:00:00.000Z",
        labelIds: ["INBOX", "UNREAD"],
        mailboxEmail: mailbox,
      },
      {
        gmailMessageId: "m4",
        gmailThreadId: "t3",
        fromHeader: "Spam <promo@newsletters.com>",
        subject: "Sale",
        snippet: "Buy now",
        receivedAt: "2026-01-04T10:00:00.000Z",
        labelIds: ["INBOX", "UNREAD"],
        mailboxEmail: mailbox,
      },
      {
        gmailMessageId: "m5",
        gmailThreadId: "t4",
        fromHeader: `Sales <${mailbox}>`,
        subject: "Our outbound",
        snippet: "Hello",
        receivedAt: "2026-01-05T10:00:00.000Z",
        labelIds: ["INBOX", "UNREAD"],
        mailboxEmail: mailbox,
      },
      {
        gmailMessageId: "m6",
        gmailThreadId: "t5",
        fromHeader: "Pat <customer@example.com>",
        subject: "Already read",
        snippet: "Read",
        receivedAt: "2026-01-06T10:00:00.000Z",
        labelIds: ["INBOX"],
        mailboxEmail: mailbox,
      },
    ];

    const items = buildCustomerReplyNotifications({ messages, emailToJob, limit: 8 });
    assert.equal(items.count, 2);
    assert.equal(items.items.length, 2);
    assert.equal(items.items[0].gmailThreadId, "t1");
    assert.equal(items.items[0].subject, "Duplicate thread newer");
    assert.equal(items.items[1].gmailThreadId, "t2");
    assert.equal(items.items[0].jobId, "job-1");
    assert.equal(items.items.every((i) => i.customerEmail === "customer@example.com"), true);
  });

  it("returns empty when no safe job match exists", () => {
    const result = buildCustomerReplyNotifications({
      messages: [
        {
          gmailMessageId: "m1",
          gmailThreadId: "t1",
          fromHeader: "Unknown <nobody@example.com>",
          subject: "Hi",
          snippet: "Hello",
          receivedAt: "2026-01-01T00:00:00.000Z",
          labelIds: ["UNREAD", "INBOX"],
          mailboxEmail: mailbox,
        },
      ],
      emailToJob: new Map(),
    });
    assert.deepEqual(result, { count: 0, items: [] });
  });

  it("formats badge counts and truncates previews", () => {
    assert.equal(formatNotificationBadgeCount(0), null);
    assert.equal(formatNotificationBadgeCount(3), "3");
    assert.equal(formatNotificationBadgeCount(99), "99");
    assert.equal(formatNotificationBadgeCount(100), "99+");
    assert.equal(truncatePreview("a".repeat(200)).endsWith("…"), true);
    assert.ok(truncatePreview("a".repeat(200)).length <= 120);
  });
});
