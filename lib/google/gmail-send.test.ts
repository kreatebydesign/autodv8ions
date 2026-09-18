import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sendGmailReply, GmailIntegrationError } from "./gmail";
import type { ParsedGmailThread } from "./gmail-message";
import { assertAdminForGmailReply } from "./gmail-reply-access";

function sampleThread(): ParsedGmailThread {
  return {
    id: "thread-1",
    subject: "Tint quote follow-up",
    unread: false,
    messages: [
      {
        gmailMessageId: "msg-parent",
        threadId: "thread-1",
        direction: "incoming",
        from: "customer@example.com",
        to: "sales@autodv8ions.com",
        subject: "Tint quote follow-up",
        sentAt: "2025-01-01T12:00:00.000Z",
        messageIdHeader: "<parent@mail.gmail.com>",
        inReplyTo: null,
        references: null,
        plainTextBody: "Hi",
        htmlBody: null,
        unread: false,
        hasAttachments: false,
      },
    ],
  };
}

describe("sendGmailReply", () => {
  it("sends through users.messages.send on success", async () => {
    let sentRaw: string | undefined;
    let sentThreadId: string | undefined;

    const result = await sendGmailReply(
      {
        threadId: "thread-1",
        customerEmail: "customer@example.com",
        body: "Thanks — we can get you scheduled this week.",
      },
      {
        resolveThread: async () => ({
          thread: sampleThread(),
          mailboxEmail: "sales@autodv8ions.com",
        }),
        getClient: async () =>
          ({
            users: {
              messages: {
                send: async (args: {
                  requestBody?: { raw?: string; threadId?: string };
                }) => {
                  sentRaw = args.requestBody?.raw;
                  sentThreadId = args.requestBody?.threadId;
                  return {
                    data: { id: "msg-sent", threadId: "thread-1" },
                  };
                },
              },
            },
          }) as never,
        refreshThread: async () => {
          const thread = sampleThread();
          thread.messages.push({
            ...thread.messages[0],
            gmailMessageId: "msg-sent",
            direction: "outgoing",
            plainTextBody: "Thanks — we can get you scheduled this week.",
          });
          return {
            thread,
            mailboxEmail: "sales@autodv8ions.com",
          };
        },
      },
    );

    assert.equal(result.gmailMessageId, "msg-sent");
    assert.equal(result.threadId, "thread-1");
    assert.equal(sentThreadId, "thread-1");
    assert.ok(sentRaw && sentRaw.length > 20);
    assert.equal(result.message?.gmailMessageId, "msg-sent");
  });

  it("maps expired/revoked Google authorization to gmail_auth_failed", async () => {
    await assert.rejects(
      () =>
        sendGmailReply(
          {
            threadId: "thread-1",
            customerEmail: "customer@example.com",
            body: "Following up",
          },
          {
            resolveThread: async () => ({
              thread: sampleThread(),
              mailboxEmail: "sales@autodv8ions.com",
            }),
            getClient: async () =>
              ({
                users: {
                  messages: {
                    send: async () => {
                      const err = new Error("invalid_grant") as Error & {
                        code?: number;
                        response?: { status?: number; data?: unknown };
                      };
                      err.code = 400;
                      err.response = {
                        status: 400,
                        data: {
                          error: "invalid_grant",
                          error_description: "Token has been expired or revoked.",
                        },
                      };
                      throw err;
                    },
                  },
                },
              }) as never,
          },
        ),
      (error: unknown) => {
        assert.ok(error instanceof GmailIntegrationError);
        assert.equal(error.code, "gmail_auth_failed");
        assert.equal(error.status, 401);
        return true;
      },
    );
  });

  it("maps temporary Google outages to gmail_temporarily_unavailable", async () => {
    await assert.rejects(
      () =>
        sendGmailReply(
          {
            threadId: "thread-1",
            customerEmail: "customer@example.com",
            body: "Following up",
          },
          {
            resolveThread: async () => ({
              thread: sampleThread(),
              mailboxEmail: "sales@autodv8ions.com",
            }),
            getClient: async () =>
              ({
                users: {
                  messages: {
                    send: async () => {
                      const err = new Error("backendError") as Error & {
                        code?: number;
                      };
                      err.code = 503;
                      throw err;
                    },
                  },
                },
              }) as never,
          },
        ),
      (error: unknown) => {
        assert.ok(error instanceof GmailIntegrationError);
        assert.equal(error.code, "gmail_temporarily_unavailable");
        assert.equal(error.status, 502);
        return true;
      },
    );
  });
});

describe("gmail reply admin access", () => {
  it("rejects unauthorized admin access before any Gmail send", () => {
    const denied = assertAdminForGmailReply(null);
    assert.equal(denied.ok, false);
    if (!denied.ok) {
      assert.equal(denied.response.status, 401);
      assert.equal(denied.response.body.error, "Unauthorized");
    }

    const allowed = assertAdminForGmailReply("admin@autodv8ions.com");
    assert.equal(allowed.ok, true);
  });
});
