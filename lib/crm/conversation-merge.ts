import type { ParsedGmailMessage } from "@/lib/google/gmail-message";
import type { JobOutboundEmail } from "@/lib/crm/outbound-email";

export type ConversationMessage = ParsedGmailMessage & {
  source: "gmail" | "resend";
  localId?: string;
};

function outboundToConversationMessage(
  row: JobOutboundEmail,
): ConversationMessage {
  return {
    gmailMessageId: `local-resend-${row.id}`,
    threadId: "",
    direction: "outgoing",
    from: "AutoDV8ions Sales <sales@autodv8ions.com>",
    to: row.to_email,
    cc: "",
    subject: row.subject,
    sentAt: row.sent_at,
    messageIdHeader: null,
    inReplyTo: null,
    references: null,
    plainTextBody: row.body_text,
    htmlBody: null,
    unread: false,
    hasAttachments: false,
    attachments: [],
    source: "resend",
    localId: row.id,
  };
}

function normalizeBodyKey(body: string): string {
  return body.trim().replace(/\s+/g, " ").toLowerCase().slice(0, 500);
}

/**
 * Merge Gmail thread messages with persisted Resend first-contact sends.
 * Drops local rows that likely duplicate an outgoing Gmail message (same body window).
 */
export function mergeConversationMessages(
  gmailMessages: ParsedGmailMessage[],
  outbound: JobOutboundEmail[],
): ConversationMessage[] {
  const gmail: ConversationMessage[] = gmailMessages.map((m) => ({
    ...m,
    source: "gmail",
  }));

  const outgoingGmailKeys = new Set(
    gmail
      .filter((m) => m.direction === "outgoing")
      .map((m) => normalizeBodyKey(m.plainTextBody || "")),
  );

  const local = outbound
    .filter((row) => {
      const key = normalizeBodyKey(row.body_text);
      if (!key) return true;
      return !outgoingGmailKeys.has(key);
    })
    .map(outboundToConversationMessage);

  return [...gmail, ...local].sort((a, b) => {
    const aTime = a.sentAt ? Date.parse(a.sentAt) : 0;
    const bTime = b.sentAt ? Date.parse(b.sentAt) : 0;
    return aTime - bTime;
  });
}
