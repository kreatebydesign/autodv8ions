import { normalizeEmailAddress } from "@/lib/google/gmail-message";

export const GMAIL_NOTIFICATION_ITEM_LIMIT = 8;
export const GMAIL_UNREAD_SCAN_MAX = 40;
export const GMAIL_PREVIEW_MAX_CHARS = 120;

export type JobEmailCandidate = {
  jobId: string;
  customerEmail: string;
  customerName: string;
  status: string;
  updatedAt: string;
  createdAt: string;
};

export type UnreadMessageCandidate = {
  gmailMessageId: string;
  gmailThreadId: string;
  fromHeader: string;
  subject: string;
  snippet: string;
  receivedAt: string | null;
  labelIds: string[];
  mailboxEmail: string;
};

export type GmailNotificationItem = {
  jobId: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  preview: string;
  receivedAt: string | null;
  gmailThreadId: string;
};

export type GmailNotificationsPayload = {
  configured: boolean;
  count: number;
  items: GmailNotificationItem[];
};

const CLOSED_JOB_STATUSES = new Set(["Completed", "Not Sold"]);

export function isClosedJobStatus(status: string): boolean {
  return CLOSED_JOB_STATUSES.has(status);
}

/**
 * Prefer the most recent active (non-Completed / non-Not Sold) job.
 * If none are active, fall back to the most recent job overall.
 */
export function pickBestJobForEmail(
  jobs: JobEmailCandidate[],
): JobEmailCandidate | null {
  if (!jobs.length) return null;

  const active = jobs.filter((job) => !isClosedJobStatus(job.status));
  const pool = active.length > 0 ? active : jobs;

  return [...pool].sort((a, b) => {
    const aUpdated = Date.parse(a.updatedAt) || 0;
    const bUpdated = Date.parse(b.updatedAt) || 0;
    if (bUpdated !== aUpdated) return bUpdated - aUpdated;
    const aCreated = Date.parse(a.createdAt) || 0;
    const bCreated = Date.parse(b.createdAt) || 0;
    return bCreated - aCreated;
  })[0];
}

export function buildEmailToJobMap(
  jobs: JobEmailCandidate[],
): Map<string, JobEmailCandidate> {
  const byEmail = new Map<string, JobEmailCandidate[]>();

  for (const job of jobs) {
    const email = normalizeEmailAddress(job.customerEmail);
    if (!email.includes("@")) continue;
    const list = byEmail.get(email) || [];
    list.push({ ...job, customerEmail: email });
    byEmail.set(email, list);
  }

  const selected = new Map<string, JobEmailCandidate>();
  for (const [email, list] of byEmail) {
    const best = pickBestJobForEmail(list);
    if (best) selected.set(email, best);
  }
  return selected;
}

export function extractSenderEmail(fromHeader: string): string | null {
  const addresses = fromHeader
    ? // reuse normalize via angle-bracket aware helper
      (() => {
        const angle = fromHeader.match(/<([^>]+@[^>]+)>/i);
        if (angle) return normalizeEmailAddress(angle[1]);
        return normalizeEmailAddress(fromHeader);
      })()
    : "";
  return addresses.includes("@") ? addresses : null;
}

export function isIncomingFromKnownCustomer(params: {
  fromHeader: string;
  mailboxEmail: string;
  knownEmails: Set<string>;
}): { senderEmail: string; matched: boolean } | null {
  const sender = extractSenderEmail(params.fromHeader);
  if (!sender) return null;

  const mailbox = normalizeEmailAddress(params.mailboxEmail);
  if (mailbox && sender === mailbox) {
    return { senderEmail: sender, matched: false };
  }

  return {
    senderEmail: sender,
    matched: params.knownEmails.has(sender),
  };
}

export function messageLooksUnread(labelIds: string[] | null | undefined): boolean {
  return Array.isArray(labelIds) && labelIds.includes("UNREAD");
}

export function truncatePreview(
  value: string,
  max = GMAIL_PREVIEW_MAX_CHARS,
): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trimEnd()}…`;
}

export function formatNotificationBadgeCount(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) return null;
  if (count > 99) return "99+";
  return String(Math.floor(count));
}

/**
 * Match unread inbox messages to known customers; one item per thread.
 * Newest first. Unmatched / outgoing / non-unread are dropped.
 */
export function buildCustomerReplyNotifications(params: {
  messages: UnreadMessageCandidate[];
  emailToJob: Map<string, JobEmailCandidate>;
  limit?: number;
}): { items: GmailNotificationItem[]; count: number } {
  const limit = params.limit ?? GMAIL_NOTIFICATION_ITEM_LIMIT;
  const knownEmails = new Set(params.emailToJob.keys());
  const byThread = new Map<string, GmailNotificationItem>();

  const sorted = [...params.messages].sort((a, b) => {
    const aTime = a.receivedAt ? Date.parse(a.receivedAt) : 0;
    const bTime = b.receivedAt ? Date.parse(b.receivedAt) : 0;
    return bTime - aTime;
  });

  for (const message of sorted) {
    if (!messageLooksUnread(message.labelIds)) continue;
    if (!message.gmailThreadId) continue;

    const match = isIncomingFromKnownCustomer({
      fromHeader: message.fromHeader,
      mailboxEmail: message.mailboxEmail,
      knownEmails,
    });
    if (!match?.matched) continue;

    const job = params.emailToJob.get(match.senderEmail);
    if (!job) continue;

    if (byThread.has(message.gmailThreadId)) continue;

    byThread.set(message.gmailThreadId, {
      jobId: job.jobId,
      customerName: job.customerName,
      customerEmail: job.customerEmail,
      subject: message.subject.trim() || "(no subject)",
      preview: truncatePreview(message.snippet || ""),
      receivedAt: message.receivedAt,
      gmailThreadId: message.gmailThreadId,
    });
  }

  const all = [...byThread.values()].sort((a, b) => {
    const aTime = a.receivedAt ? Date.parse(a.receivedAt) : 0;
    const bTime = b.receivedAt ? Date.parse(b.receivedAt) : 0;
    return bTime - aTime;
  });

  return {
    count: all.length,
    items: all.slice(0, limit),
  };
}
