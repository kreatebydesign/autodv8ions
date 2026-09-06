import type { gmail_v1 } from "googleapis";

/** Max characters returned per message body in API payloads. */
export const GMAIL_BODY_CHAR_LIMIT = 50_000;

/** Max characters accepted for an outbound reply body. */
export const GMAIL_REPLY_BODY_MAX = 10_000;

/** Max threads returned from a customer email search. */
export const GMAIL_THREAD_SEARCH_MAX = 10;

export type GmailMessageDirection = "incoming" | "outgoing";

export type ParsedGmailMessage = {
  gmailMessageId: string;
  threadId: string;
  direction: GmailMessageDirection;
  from: string;
  to: string;
  subject: string;
  sentAt: string | null;
  messageIdHeader: string | null;
  inReplyTo: string | null;
  references: string | null;
  plainTextBody: string;
  htmlBody: string | null;
  unread: boolean;
  hasAttachments: boolean;
};

export type ParsedGmailThread = {
  id: string;
  subject: string;
  unread: boolean;
  messages: ParsedGmailMessage[];
};

export type GmailThreadCandidate = {
  id: string;
  snippet: string;
  historyId: string | null;
};

/**
 * Decode Gmail's base64url payload data to UTF-8 text.
 */
export function decodeGmailBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4;
  const padded = pad ? normalized + "=".repeat(4 - pad) : normalized;
  return Buffer.from(padded, "base64").toString("utf8");
}

/**
 * Encode raw RFC 2822 bytes as Gmail `raw` base64url (no padding).
 */
export function encodeGmailRaw(rawMessage: string | Buffer): string {
  const buf = typeof rawMessage === "string" ? Buffer.from(rawMessage, "utf8") : rawMessage;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function normalizeEmailAddress(value: string): string {
  const trimmed = value.trim().toLowerCase();
  const angle = trimmed.match(/<([^>]+)>/);
  const candidate = (angle ? angle[1] : trimmed).trim().toLowerCase();
  // Strip display-name leftovers if present without brackets.
  const bare = candidate.includes("@")
    ? candidate.replace(/^.*\s+/, "").replace(/[>,;]+$/g, "")
    : candidate;
  return bare;
}

export function extractEmailAddresses(headerValue: string): string[] {
  if (!headerValue.trim()) return [];
  const found = new Set<string>();
  const angleMatches = headerValue.matchAll(/<([^>]+@[^>]+)>/g);
  for (const match of angleMatches) {
    found.add(normalizeEmailAddress(match[1]));
  }
  if (found.size === 0) {
    const parts = headerValue.split(",");
    for (const part of parts) {
      const email = normalizeEmailAddress(part);
      if (email.includes("@")) found.add(email);
    }
  }
  return [...found];
}

export function buildCustomerEmailSearchQuery(customerEmail: string): string {
  const email = normalizeEmailAddress(customerEmail);
  if (!email.includes("@")) {
    throw new Error("Invalid customer email for Gmail search");
  }
  // Quote the address so Gmail treats it as a single token.
  return `from:${email} OR to:${email}`;
}

export function getHeader(
  headers: gmail_v1.Schema$MessagePartHeader[] | null | undefined,
  name: string,
): string {
  if (!headers?.length) return "";
  const target = name.toLowerCase();
  const hit = headers.find((h) => String(h.name || "").toLowerCase() === target);
  return String(hit?.value || "").trim();
}

type ExtractedBodies = {
  plainText: string;
  html: string | null;
  hasAttachments: boolean;
};

function contentTypeOf(part: gmail_v1.Schema$MessagePart): string {
  return String(part.mimeType || getHeader(part.headers, "Content-Type") || "")
    .toLowerCase()
    .split(";")[0]
    .trim();
}

function isAttachmentPart(part: gmail_v1.Schema$MessagePart): boolean {
  const disposition = getHeader(part.headers, "Content-Disposition").toLowerCase();
  if (disposition.includes("attachment")) return true;
  if (part.filename && part.filename.trim()) {
    const mime = contentTypeOf(part);
    if (mime !== "text/plain" && mime !== "text/html") return true;
  }
  return false;
}

function decodePartBody(part: gmail_v1.Schema$MessagePart): string {
  const data = part.body?.data;
  if (!data) return "";
  try {
    return decodeGmailBase64Url(data);
  } catch {
    return "";
  }
}

/**
 * Walk nested multipart trees; prefer text/plain, capture first html fallback.
 */
export function extractBodiesFromPayload(
  payload: gmail_v1.Schema$MessagePart | null | undefined,
): ExtractedBodies {
  let plainText = "";
  let html: string | null = null;
  let hasAttachments = false;

  function visit(part: gmail_v1.Schema$MessagePart | null | undefined) {
    if (!part) return;

    if (isAttachmentPart(part)) {
      hasAttachments = true;
    }

    const mime = contentTypeOf(part);
    const children = part.parts;

    if (children?.length) {
      for (const child of children) visit(child);
      return;
    }

    if (mime === "text/plain") {
      const text = decodePartBody(part);
      if (text && !plainText) plainText = text;
      return;
    }

    if (mime === "text/html") {
      const text = decodePartBody(part);
      if (text && !html) html = text;
      return;
    }
  }

  visit(payload);

  // Single-part message with body on the root payload.
  if (!plainText && !html && payload?.body?.data) {
    const mime = contentTypeOf(payload);
    const text = decodePartBody(payload);
    if (mime === "text/html") html = text;
    else plainText = text;
  }

  return {
    plainText: truncateBody(plainText),
    html: html ? truncateBody(html) : null,
    hasAttachments,
  };
}

export function truncateBody(value: string, limit = GMAIL_BODY_CHAR_LIMIT): string {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit)}\n\n[…truncated…]`;
}

export function detectDirection(
  fromHeader: string,
  mailboxEmail: string,
): GmailMessageDirection {
  const mailbox = normalizeEmailAddress(mailboxEmail);
  const fromAddresses = extractEmailAddresses(fromHeader);
  if (fromAddresses.some((addr) => addr === mailbox)) return "outgoing";
  return "incoming";
}

export function messageIsUnread(
  labelIds: string[] | null | undefined,
): boolean {
  return Array.isArray(labelIds) && labelIds.includes("UNREAD");
}

export function threadInvolvesCustomer(
  messages: Array<{ from: string; to: string }>,
  customerEmail: string,
): boolean {
  const customer = normalizeEmailAddress(customerEmail);
  if (!customer.includes("@")) return false;

  for (const message of messages) {
    const parties = [
      ...extractEmailAddresses(message.from),
      ...extractEmailAddresses(message.to),
    ];
    if (parties.includes(customer)) return true;
  }
  return false;
}

export function buildReplySubject(originalSubject: string): string {
  const subject = originalSubject.trim() || "(no subject)";
  if (/^re:\s/i.test(subject)) return subject;
  return `Re: ${subject}`;
}

/**
 * Build References header: prior chain + parent Message-ID (deduped, space-separated).
 */
export function buildReferencesHeader(
  parentReferences: string | null | undefined,
  parentMessageId: string,
): string {
  const tokens: string[] = [];
  const seen = new Set<string>();

  const push = (raw: string) => {
    const token = raw.trim();
    if (!token) return;
    const key = token.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    tokens.push(token);
  };

  if (parentReferences) {
    for (const part of parentReferences.trim().split(/\s+/)) push(part);
  }
  push(parentMessageId);
  return tokens.join(" ");
}

function encodeRfc2047Subject(subject: string): string {
  // ASCII-safe subjects stay plain; otherwise use encoded-word.
  if (/^[\x20-\x7E]*$/.test(subject)) return subject;
  const b64 = Buffer.from(subject, "utf8").toString("base64");
  return `=?UTF-8?B?${b64}?=`;
}

/**
 * Build a plain-text RFC 2822 reply suitable for Gmail `messages.send` raw.
 */
export function buildReplyMime(params: {
  from: string;
  to: string;
  subject: string;
  inReplyTo: string;
  references: string;
  body: string;
}): string {
  const bodyBase64 = Buffer.from(params.body, "utf8").toString("base64");
  const headers = [
    `From: ${params.from}`,
    `To: ${params.to}`,
    `Subject: ${encodeRfc2047Subject(params.subject)}`,
    `In-Reply-To: ${params.inReplyTo}`,
    `References: ${params.references}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
  ];
  return `${headers.join("\r\n")}\r\n\r\n${bodyBase64}`;
}

export function parseGmailMessage(
  message: gmail_v1.Schema$Message,
  mailboxEmail: string,
): ParsedGmailMessage {
  const payload = message.payload;
  const headers = payload?.headers;
  const from = getHeader(headers, "From");
  const to = getHeader(headers, "To");
  const subject = getHeader(headers, "Subject");
  const messageIdHeader = getHeader(headers, "Message-ID") || null;
  const inReplyTo = getHeader(headers, "In-Reply-To") || null;
  const references = getHeader(headers, "References") || null;
  const bodies = extractBodiesFromPayload(payload);

  const internalDate = message.internalDate
    ? new Date(Number(message.internalDate)).toISOString()
    : null;

  return {
    gmailMessageId: String(message.id || ""),
    threadId: String(message.threadId || ""),
    direction: detectDirection(from, mailboxEmail),
    from,
    to,
    subject,
    sentAt: internalDate,
    messageIdHeader,
    inReplyTo,
    references,
    plainTextBody: bodies.plainText,
    htmlBody: bodies.plainText ? null : bodies.html,
    unread: messageIsUnread(message.labelIds),
    hasAttachments: bodies.hasAttachments,
  };
}

export function parseGmailThread(
  thread: gmail_v1.Schema$Thread,
  mailboxEmail: string,
): ParsedGmailThread {
  const rawMessages = thread.messages || [];
  const messages = rawMessages
    .map((m) => parseGmailMessage(m, mailboxEmail))
    .filter((m) => m.gmailMessageId)
    .sort((a, b) => {
      const aTime = a.sentAt ? Date.parse(a.sentAt) : 0;
      const bTime = b.sentAt ? Date.parse(b.sentAt) : 0;
      return aTime - bTime;
    });

  const subject =
    messages.find((m) => m.subject)?.subject ||
    messages[0]?.subject ||
    "(no subject)";

  return {
    id: String(thread.id || ""),
    subject,
    unread: messages.some((m) => m.unread),
    messages,
  };
}

export function selectMostRecentThreadId(
  candidates: GmailThreadCandidate[],
): string | null {
  // threads.list returns newest-activity-first; take the first with an id.
  return candidates.find((c) => c.id)?.id || null;
}

export function pickReplyParentMessage(
  messages: ParsedGmailMessage[],
): ParsedGmailMessage | null {
  if (!messages.length) return null;
  // Prefer the most recent message that has a Message-ID header.
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].messageIdHeader) return messages[i];
  }
  return messages[messages.length - 1] || null;
}
