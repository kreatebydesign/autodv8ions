/** Client-safe Gmail Communication UI helpers (no googleapis). */

export const GMAIL_REPLY_BODY_MAX_CLIENT = 10_000;

/** How many newest messages to show before progressive reveal. */
export const GMAIL_VISIBLE_MESSAGE_DEFAULT = 5;

export type CommMessageLike = {
  gmailMessageId: string;
  direction: "incoming" | "outgoing";
  from: string;
  sentAt: string | null;
  plainTextBody: string;
  htmlBody: string | null;
  unread: boolean;
};

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

export function displaySenderLabel(from: string, direction: "incoming" | "outgoing"): string {
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
  return Boolean(message.plainTextBody?.trim());
}
