import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { gmail_v1 } from "googleapis";
import {
  buildCustomerEmailSearchQuery,
  buildReferencesHeader,
  buildNewMessageMime,
  buildReplyMime,
  buildReplySubject,
  decodeGmailBase64Url,
  detectDirection,
  encodeGmailRaw,
  extractBodiesFromPayload,
  messageIsUnread,
  normalizeEmailAddress,
  parseGmailMessage,
  parseGmailThread,
  selectBestThreadIdByLatestActivity,
  selectMostRecentThreadId,
  threadInvolvesCustomer,
  truncateBody,
} from "./gmail-message";
import type { ParsedGmailThread } from "./gmail-message";

describe("gmail base64url", () => {
  it("decodes Gmail base64url payloads", () => {
    const text = "Hello CRM — Phase 1";
    const encoded = Buffer.from(text, "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
    assert.equal(decodeGmailBase64Url(encoded), text);
  });

  it("encodes raw MIME for Gmail send without padding", () => {
    const raw = "Subject: Test\r\n\r\nHi";
    const encoded = encodeGmailRaw(raw);
    assert.equal(encoded.includes("="), false);
    assert.equal(encoded.includes("+"), false);
    assert.equal(encoded.includes("/"), false);
    assert.equal(decodeGmailBase64Url(encoded), raw);
  });
});

describe("gmail body extraction", () => {
  it("prefers nested multipart/alternative plain text", () => {
    const plain = "Plain reply body";
    const html = "<p>HTML reply body</p>";
    const payload: gmail_v1.Schema$MessagePart = {
      mimeType: "multipart/mixed",
      parts: [
        {
          mimeType: "multipart/alternative",
          parts: [
            {
              mimeType: "text/plain",
              body: {
                data: Buffer.from(plain, "utf8")
                  .toString("base64")
                  .replace(/\+/g, "-")
                  .replace(/\//g, "_")
                  .replace(/=+$/g, ""),
              },
            },
            {
              mimeType: "text/html",
              body: {
                data: Buffer.from(html, "utf8")
                  .toString("base64")
                  .replace(/\+/g, "-")
                  .replace(/\//g, "_")
                  .replace(/=+$/g, ""),
              },
            },
          ],
        },
        {
          mimeType: "application/pdf",
          filename: "quote.pdf",
          body: { attachmentId: "att-1", size: 12 },
          headers: [
            { name: "Content-Disposition", value: 'attachment; filename="quote.pdf"' },
          ],
        },
      ],
    };

    const bodies = extractBodiesFromPayload(payload);
    assert.equal(bodies.plainText, plain);
    assert.equal(bodies.html, html);
    assert.equal(bodies.hasAttachments, true);
  });

  it("parses attachment metadata on messages", () => {
    const payload: gmail_v1.Schema$MessagePart = {
      mimeType: "multipart/mixed",
      parts: [
        {
          mimeType: "text/plain",
          body: {
            data: Buffer.from("Body", "utf8")
              .toString("base64")
              .replace(/\+/g, "-")
              .replace(/\//g, "_")
              .replace(/=+$/g, ""),
          },
        },
        {
          mimeType: "application/pdf",
          filename: "quote.pdf",
          partId: "1",
          body: { attachmentId: "att-1", size: 12 },
        },
      ],
    };

    const parsed = parseGmailMessage(
      {
        id: "msg-1",
        threadId: "thread-1",
        labelIds: ["INBOX"],
        internalDate: String(Date.now()),
        payload: {
          headers: [{ name: "From", value: "c@example.com" }],
          mimeType: payload.mimeType,
          parts: payload.parts,
        },
      },
      "sales@autodv8ions.com",
    );
    assert.equal(parsed.attachments.length, 1);
    assert.equal(parsed.attachments[0].filename, "quote.pdf");
    assert.equal(parsed.hasAttachments, true);
  });

  it("truncates oversized bodies", () => {
    const long = "x".repeat(60_000);
    const out = truncateBody(long, 100);
    assert.ok(out.length < long.length);
    assert.ok(out.includes("[…truncated…]"));
  });
});

describe("direction and unread", () => {
  it("detects outgoing when From matches mailbox", () => {
    assert.equal(
      detectDirection("AutoDV8ions Sales <sales@autodv8ions.com>", "sales@autodv8ions.com"),
      "outgoing",
    );
    assert.equal(
      detectDirection("Customer <customer@example.com>", "sales@autodv8ions.com"),
      "incoming",
    );
  });

  it("detects outgoing when Gmail SENT label is present", () => {
    assert.equal(
      detectDirection(
        "Chris <chris@autodv8ions.com>",
        "sales@autodv8ions.com",
        ["SENT", "INBOX"],
      ),
      "outgoing",
    );
  });

  it("detects UNREAD label", () => {
    assert.equal(messageIsUnread(["INBOX", "UNREAD"]), true);
    assert.equal(messageIsUnread(["INBOX", "SENT"]), false);
    assert.equal(messageIsUnread(null), false);
  });
});

describe("reply MIME headers", () => {
  it("builds Re: subject without doubling", () => {
    assert.equal(buildReplySubject("Tint quote"), "Re: Tint quote");
    assert.equal(buildReplySubject("Re: Tint quote"), "Re: Tint quote");
    assert.equal(buildReplySubject("RE: already"), "RE: already");
  });

  it("builds References from parent chain + Message-ID", () => {
    assert.equal(
      buildReferencesHeader("<a@mail.gmail.com> <b@mail.gmail.com>", "<c@mail.gmail.com>"),
      "<a@mail.gmail.com> <b@mail.gmail.com> <c@mail.gmail.com>",
    );
    assert.equal(
      buildReferencesHeader("<a@mail.gmail.com>", "<a@mail.gmail.com>"),
      "<a@mail.gmail.com>",
    );
  });

  it("builds a new-thread MIME without reply headers", () => {
    const mime = buildNewMessageMime({
      from: "sales@autodv8ions.com",
      to: "customer@example.com",
      subject: "Window tint quote",
      body: "Hello from AutoDV8ions.",
    });
    assert.match(mime, /Subject: Window tint quote\r\n/);
    assert.doesNotMatch(mime, /In-Reply-To:/);
    assert.doesNotMatch(mime, /References:/);
  });

  it("includes In-Reply-To and References in MIME", () => {
    const mime = buildReplyMime({
      from: "sales@autodv8ions.com",
      to: "customer@example.com",
      subject: "Re: Hello",
      inReplyTo: "<parent@mail.gmail.com>",
      references: "<root@mail.gmail.com> <parent@mail.gmail.com>",
      body: "Thanks — we are confirmed.",
    });

    assert.match(mime, /^From: sales@autodv8ions.com\r\n/);
    assert.match(mime, /To: customer@example.com\r\n/);
    assert.match(mime, /Subject: Re: Hello\r\n/);
    assert.match(mime, /In-Reply-To: <parent@mail.gmail.com>\r\n/);
    assert.match(
      mime,
      /References: <root@mail.gmail.com> <parent@mail.gmail.com>\r\n/,
    );
    assert.match(mime, /Content-Type: text\/plain; charset="UTF-8"\r\n/);
    assert.ok(!mime.includes("Thanks — we are confirmed."));
    const bodyPart = mime.split("\r\n\r\n")[1];
    assert.equal(
      Buffer.from(bodyPart, "base64").toString("utf8"),
      "Thanks — we are confirmed.",
    );
  });
});

describe("thread / customer validation", () => {
  it("builds from/to/cc search query", () => {
    assert.equal(
      buildCustomerEmailSearchQuery("Customer <Person@Example.COM>"),
      "(from:person@example.com OR to:person@example.com OR cc:person@example.com)",
    );
  });

  it("includes cc when matching customer participation", () => {
    assert.equal(
      threadInvolvesCustomer(
        [
          {
            from: "sales@autodv8ions.com",
            to: "other@example.com",
            cc: "customer@example.com",
          },
        ],
        "customer@example.com",
      ),
      true,
    );
  });

  it("requires customer email in from or to", () => {
    assert.equal(
      threadInvolvesCustomer(
        [
          {
            from: "sales@autodv8ions.com",
            to: "customer@example.com",
          },
        ],
        "customer@example.com",
      ),
      true,
    );
    assert.equal(
      threadInvolvesCustomer(
        [
          {
            from: "sales@autodv8ions.com",
            to: "someone-else@example.com",
          },
        ],
        "customer@example.com",
      ),
      false,
    );
  });

  it("selects most recent candidate (first in list)", () => {
    assert.equal(
      selectMostRecentThreadId([
        { id: "thread-new", snippet: "a", historyId: null },
        { id: "thread-old", snippet: "b", historyId: null },
      ]),
      "thread-new",
    );
    assert.equal(selectMostRecentThreadId([]), null);
  });

  it("normalizes addresses", () => {
    assert.equal(
      normalizeEmailAddress("Name <Sales@AutoDV8ions.com>"),
      "sales@autodv8ions.com",
    );
  });
});

describe("parseGmailMessage / thread", () => {
  it("parses chronological messages and unread rollup", () => {
    const thread: gmail_v1.Schema$Thread = {
      id: "t1",
      messages: [
        {
          id: "m2",
          threadId: "t1",
          labelIds: ["INBOX"],
          internalDate: "2000",
          payload: {
            headers: [
              { name: "From", value: "sales@autodv8ions.com" },
              { name: "To", value: "customer@example.com" },
              { name: "Subject", value: "Re: Hello" },
              { name: "Message-ID", value: "<m2@mail>" },
            ],
            mimeType: "text/plain",
            body: {
              data: Buffer.from("Our reply", "utf8")
                .toString("base64")
                .replace(/\+/g, "-")
                .replace(/\//g, "_")
                .replace(/=+$/g, ""),
            },
          },
        },
        {
          id: "m1",
          threadId: "t1",
          labelIds: ["INBOX", "UNREAD"],
          internalDate: "1000",
          payload: {
            headers: [
              { name: "From", value: "customer@example.com" },
              { name: "To", value: "sales@autodv8ions.com" },
              { name: "Subject", value: "Hello" },
              { name: "Message-ID", value: "<m1@mail>" },
            ],
            mimeType: "text/plain",
            body: {
              data: Buffer.from("Customer hello", "utf8")
                .toString("base64")
                .replace(/\+/g, "-")
                .replace(/\//g, "_")
                .replace(/=+$/g, ""),
            },
          },
        },
      ],
    };

    const parsed = parseGmailThread(thread, "sales@autodv8ions.com");
    assert.equal(parsed.messages.length, 2);
    assert.equal(parsed.messages[0].gmailMessageId, "m1");
    assert.equal(parsed.messages[0].direction, "incoming");
    assert.equal(parsed.messages[0].unread, true);
    assert.equal(parsed.messages[1].direction, "outgoing");
    assert.equal(parsed.unread, true);
    assert.equal(parsed.subject, "Hello");
  });

  it("omits htmlBody when plain text exists", () => {
    const message: gmail_v1.Schema$Message = {
      id: "m",
      threadId: "t",
      labelIds: [],
      payload: {
        mimeType: "multipart/alternative",
        parts: [
          {
            mimeType: "text/plain",
            body: {
              data: Buffer.from("plain", "utf8")
                .toString("base64")
                .replace(/\+/g, "-")
                .replace(/\//g, "_")
                .replace(/=+$/g, ""),
            },
          },
          {
            mimeType: "text/html",
            body: {
              data: Buffer.from("<b>html</b>", "utf8")
                .toString("base64")
                .replace(/\+/g, "-")
                .replace(/\//g, "_")
                .replace(/=+$/g, ""),
            },
          },
        ],
        headers: [
          { name: "From", value: "a@example.com" },
          { name: "To", value: "sales@autodv8ions.com" },
          { name: "Subject", value: "S" },
        ],
      },
    };

    const parsed = parseGmailMessage(message, "sales@autodv8ions.com");
    assert.equal(parsed.plainTextBody, "plain");
    assert.equal(parsed.htmlBody, null);
  });
});

describe("no-thread response shape helpers", () => {
  it("treats empty candidate list as no thread", () => {
    assert.equal(selectMostRecentThreadId([]), null);
  });

  it("picks thread with latest activity when multiple candidates exist", () => {
    const older: ParsedGmailThread = {
      id: "thread-old",
      subject: "Old",
      unread: false,
      messages: [
        {
          gmailMessageId: "m1",
          threadId: "thread-old",
          direction: "incoming",
          from: "customer@example.com",
          to: "sales@autodv8ions.com",
          cc: "",
          subject: "Old",
          sentAt: "2024-01-01T00:00:00.000Z",
          messageIdHeader: "<1>",
          inReplyTo: null,
          references: null,
          plainTextBody: "old",
          htmlBody: null,
          unread: false,
          hasAttachments: false,
          attachments: [],
        },
      ],
    };
    const newer: ParsedGmailThread = {
      id: "thread-new",
      subject: "New",
      unread: false,
      messages: [
        {
          gmailMessageId: "m2",
          threadId: "thread-new",
          direction: "outgoing",
          from: "sales@autodv8ions.com",
          to: "customer@example.com",
          cc: "",
          subject: "New",
          sentAt: "2025-06-01T00:00:00.000Z",
          messageIdHeader: "<2>",
          inReplyTo: null,
          references: null,
          plainTextBody: "sent",
          htmlBody: null,
          unread: false,
          hasAttachments: false,
          attachments: [],
        },
      ],
    };

    assert.equal(
      selectBestThreadIdByLatestActivity(
        [older, newer],
        "customer@example.com",
        [
          { id: "thread-old", snippet: "", historyId: null },
          { id: "thread-new", snippet: "", historyId: null },
        ],
      ),
      "thread-new",
    );
  });
});
