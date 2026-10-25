/** Client-safe Gmail Communication UI helpers (no googleapis). */

export const GMAIL_REPLY_BODY_MAX_CLIENT = 10_000;

/** How many newest messages to show before progressive reveal. */
export const GMAIL_VISIBLE_MESSAGE_DEFAULT = 12;

export type CommMessageLike = {
  gmailMessageId: string;
  direction: "incoming" | "outgoing";
  from: string;
  to?: string;
  cc?: string;
  subject?: string;
  sentAt: string | null;
  plainTextBody: string;
  htmlBody: string | null;
  unread: boolean;
};

const HTML_ENTITY_MAP: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
};

export function decodeHtmlEntities(text: string): string {
  let out = text;
  for (const [entity, char] of Object.entries(HTML_ENTITY_MAP)) {
    out = out.split(entity).join(char);
  }
  out = out.replace(/&#(\d+);/g, (_, code) => {
    const n = Number(code);
    return Number.isFinite(n) ? String.fromCodePoint(n) : _;
  });
  out = out.replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
    const n = parseInt(hex, 16);
    return Number.isFinite(n) ? String.fromCodePoint(n) : _;
  });
  return out;
}

/**
 * Strip HTML to readable plain text for admin thread display (no raw HTML injection).
 */
export function htmlToPlainText(html: string): string {
  let text = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*\/\s*p\s*>/gi, "\n\n")
    .replace(/<\s*\/\s*div\s*>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "• ")
    .replace(/<\s*\/\s*li\s*>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "");

  text = decodeHtmlEntities(text);

  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function getMessageBodyText(message: CommMessageLike): string {
  const plain = message.plainTextBody?.trim();
  if (plain) return message.plainTextBody;
  if (message.htmlBody?.trim()) return htmlToPlainText(message.htmlBody);
  return "";
}

export function buildGmailThreadUrl(threadId: string): string {
  const id = threadId.trim();
  if (!id) return "https://mail.google.com/mail/";
  // `#all/` is the durable deep-link form for a thread id in Gmail web.
  return `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(id)}`;
}

export function getVisibleMessages<T>(
  messages: T[],
  options: { showAll: boolean; limit?: number },
): { visible: T[]; hiddenCount: number } {
  const limit = options.limit ?? GMAIL_VISIBLE_MESSAGE_DEFAULT;
  if (options.showAll || messages.length <= limit) {
    return { visible: messages, hiddenCount: 0 };
  }
  const hiddenCount = messages.length - limit;
  return {
    visible: messages.slice(hiddenCount),
    hiddenCount,
  };
}

export function displaySenderLabel(
  from: string,
  direction: "incoming" | "outgoing",
): string {
  if (direction === "outgoing") return "AutoDV8ions";
  const trimmed = from.trim();
  if (!trimmed) return "Customer";
  const angle = trimmed.match(/^(.*?)\s*<[^>]+>$/);
  if (angle && angle[1].trim()) return angle[1].trim().replace(/^"|"$/g, "");
  return trimmed;
}

export function formatMessageTimestamp(sentAt: string | null): string {
  if (!sentAt) return "Unknown time";
  const date = new Date(sentAt);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function hasRenderablePlainBody(message: CommMessageLike): boolean {
  return Boolean(getMessageBodyText(message).trim());
}

export function formatMessageParties(
  message: CommMessageLike,
): { from: string; to: string } {
  const from = displaySenderLabel(message.from, message.direction);
  if (message.direction === "outgoing") {
    const toRaw = message.to?.trim() || "Customer";
    const toAddresses = toRaw
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const to =
      toAddresses.length === 1
        ? displaySenderLabel(toAddresses[0], "incoming")
        : toRaw;
    return { from, to };
  }
  return { from, to: "AutoDV8ions" };
}

export function isGmailAuthorizationErrorCode(
  code: string | null | undefined,
): boolean {
  return (
    code === "gmail_auth_failed" ||
    code === "gmail_reconnect_required" ||
    code === "gmail_wrong_account" ||
    code === "gmail_refresh_token_missing" ||
    code === "gmail_insufficient_scope" ||
    code === "google_auth_failed" ||
    code === "google_wrong_account" ||
    code === "google_refresh_token_missing" ||
    code === "google_insufficient_scope" ||
    code === "calendar_auth_failed" ||
    code === "calendar_wrong_account"
  );
}

export function isGmailTemporaryErrorCode(
  code: string | null | undefined,
): boolean {
  return (
    code === "gmail_temporarily_unavailable" ||
    code === "gmail_api_failed" ||
    code === "gmail_reply_failed" ||
    code === "calendar_temporarily_unavailable" ||
    code === "calendar_api_failed"
  );
}

export function buildGoogleWorkspaceReconnectHref(returnTo: string): string {
  const safe =
    returnTo.startsWith("/admin") && !returnTo.startsWith("//")
      ? returnTo
      : "/admin/jobs";
  const params = new URLSearchParams({ returnTo: safe });
  return `/api/admin/google/oauth/start?${params.toString()}`;
}

/** @deprecated Use buildGoogleWorkspaceReconnectHref */
export function buildGmailReconnectHref(returnTo: string): string {
  return buildGoogleWorkspaceReconnectHref(returnTo);
}
