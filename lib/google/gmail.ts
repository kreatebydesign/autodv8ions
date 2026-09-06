import { google, type gmail_v1 } from "googleapis";
import {
  GMAIL_REPLY_BODY_MAX,
  GMAIL_THREAD_SEARCH_MAX,
  buildCustomerEmailSearchQuery,
  buildReferencesHeader,
  buildReplyMime,
  buildReplySubject,
  encodeGmailRaw,
  getHeader,
  normalizeEmailAddress,
  parseGmailThread,
  pickReplyParentMessage,
  selectMostRecentThreadId,
  threadInvolvesCustomer,
  type GmailThreadCandidate,
  type ParsedGmailMessage,
  type ParsedGmailThread,
} from "@/lib/google/gmail-message";
import {
  GMAIL_NOTIFICATION_ITEM_LIMIT,
  GMAIL_UNREAD_SCAN_MAX,
  buildCustomerReplyNotifications,
  type GmailNotificationsPayload,
  type JobEmailCandidate,
  type UnreadMessageCandidate,
} from "@/lib/google/gmail-notifications";

/**
 * Gmail OAuth — isolated from Calendar.
 *
 * Uses GOOGLE_GMAIL_REFRESH_TOKEN only.
 * Never reads GOOGLE_REFRESH_TOKEN (Calendar / legacy Drive).
 */

export type GmailProfileSummary = {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
};

export type GmailSendReplyResult = {
  gmailMessageId: string;
  threadId: string;
  message: ParsedGmailMessage | null;
};

export class GmailIntegrationError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "GmailIntegrationError";
    this.code = code;
    this.status = status;
  }
}

export function isGoogleGmailConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_GMAIL_REFRESH_TOKEN,
  );
}

function getGmailUserId() {
  return process.env.GOOGLE_GMAIL_USER?.trim() || "me";
}

function getGmailOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new GmailIntegrationError(
      "gmail_not_configured",
      "Gmail is not configured.",
      503,
    );
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

/** Authenticated Gmail API client for the connected mailbox. */
export function getGmailClient(): gmail_v1.Gmail {
  const auth = getGmailOAuthClient();
  return google.gmail({ version: "v1", auth });
}

function mapGmailApiError(error: unknown, fallbackCode: string, fallbackMessage: string) {
  if (error instanceof GmailIntegrationError) return error;

  const err = error as {
    code?: number | string;
    status?: number;
    response?: { status?: number; data?: { error?: { message?: string; status?: string } } };
    message?: string;
  };

  const status = Number(err.code ?? err.status ?? err.response?.status ?? 0);
  const apiMessage = err.response?.data?.error?.message || err.message || "";

  if (status === 401 || status === 403) {
    return new GmailIntegrationError(
      "gmail_auth_failed",
      "Gmail authorization failed.",
      502,
    );
  }

  if (status === 404) {
    return new GmailIntegrationError(
      "gmail_thread_missing",
      "Thread no longer exists.",
      404,
    );
  }

  // Avoid logging bodies; surface only a short safe message.
  if (apiMessage && /invalid_grant|invalid credentials/i.test(apiMessage)) {
    return new GmailIntegrationError(
      "gmail_auth_failed",
      "Gmail authorization failed.",
      502,
    );
  }

  return new GmailIntegrationError(fallbackCode, fallbackMessage, 502);
}

/**
 * Lightweight connection check via users.getProfile.
 * Returns mailbox identity and aggregate counts only — no message content.
 */
export async function getGmailProfile(): Promise<GmailProfileSummary> {
  try {
    const gmail = getGmailClient();
    const { data } = await gmail.users.getProfile({ userId: getGmailUserId() });

    const emailAddress = String(data.emailAddress || "").trim();
    if (!emailAddress) {
      throw new GmailIntegrationError(
        "gmail_api_failed",
        "Gmail API request failed.",
        502,
      );
    }

    return {
      emailAddress,
      messagesTotal: Number(data.messagesTotal ?? 0),
      threadsTotal: Number(data.threadsTotal ?? 0),
    };
  } catch (error) {
    throw mapGmailApiError(error, "gmail_api_failed", "Gmail API request failed.");
  }
}

async function resolveMailboxEmail(gmail: gmail_v1.Gmail): Promise<string> {
  const configured = process.env.GOOGLE_GMAIL_USER?.trim();
  if (configured?.includes("@")) return normalizeEmailAddress(configured);

  const { data } = await gmail.users.getProfile({ userId: getGmailUserId() });
  const email = String(data.emailAddress || "").trim();
  if (!email) {
    throw new GmailIntegrationError(
      "gmail_api_failed",
      "Gmail API request failed.",
      502,
    );
  }
  return normalizeEmailAddress(email);
}

/**
 * Search Gmail for threads involving a customer email (from OR to).
 * Returns a small newest-first candidate list.
 */
export async function findThreadsForEmail(
  customerEmail: string,
): Promise<GmailThreadCandidate[]> {
  const query = buildCustomerEmailSearchQuery(customerEmail);

  try {
    const gmail = getGmailClient();
    const { data } = await gmail.users.threads.list({
      userId: getGmailUserId(),
      q: query,
      maxResults: GMAIL_THREAD_SEARCH_MAX,
    });

    return (data.threads || [])
      .map((thread) => ({
        id: String(thread.id || ""),
        snippet: String(thread.snippet || ""),
        historyId: thread.historyId ? String(thread.historyId) : null,
      }))
      .filter((t) => t.id);
  } catch (error) {
    throw mapGmailApiError(error, "gmail_api_failed", "Gmail API request failed.");
  }
}

/**
 * Phase 1 selection: most recent matching thread (threads.list order).
 * Returns null when none found. Structured for future explicit linkage.
 */
export async function findBestThreadIdForEmail(
  customerEmail: string,
): Promise<{ threadId: string | null; candidateCount: number }> {
  const candidates = await findThreadsForEmail(customerEmail);
  return {
    threadId: selectMostRecentThreadId(candidates),
    candidateCount: candidates.length,
  };
}

export async function getGmailThread(threadId: string): Promise<{
  thread: ParsedGmailThread;
  mailboxEmail: string;
}> {
  if (!threadId.trim()) {
    throw new GmailIntegrationError(
      "gmail_thread_missing",
      "Thread no longer exists.",
      404,
    );
  }

  try {
    const gmail = getGmailClient();
    const mailboxEmail = await resolveMailboxEmail(gmail);
    const { data } = await gmail.users.threads.get({
      userId: getGmailUserId(),
      id: threadId,
      format: "full",
    });

    if (!data.id) {
      throw new GmailIntegrationError(
        "gmail_thread_missing",
        "Thread no longer exists.",
        404,
      );
    }

    return {
      thread: parseGmailThread(data, mailboxEmail),
      mailboxEmail,
    };
  } catch (error) {
    throw mapGmailApiError(error, "gmail_api_failed", "Gmail API request failed.");
  }
}

/**
 * Remove UNREAD from messages in the thread (actual Gmail mailbox).
 * Does not touch other labels.
 */
export async function markThreadRead(threadId: string): Promise<void> {
  try {
    const gmail = getGmailClient();
    const { data } = await gmail.users.threads.get({
      userId: getGmailUserId(),
      id: threadId,
      format: "minimal",
    });

    const unreadIds = (data.messages || [])
      .filter((m) => Array.isArray(m.labelIds) && m.labelIds.includes("UNREAD"))
      .map((m) => String(m.id || ""))
      .filter(Boolean);

    for (const id of unreadIds) {
      await gmail.users.messages.modify({
        userId: getGmailUserId(),
        id,
        requestBody: {
          removeLabelIds: ["UNREAD"],
        },
      });
    }
  } catch (error) {
    throw mapGmailApiError(error, "gmail_api_failed", "Gmail API request failed.");
  }
}

export async function assertThreadBelongsToCustomer(
  threadId: string,
  customerEmail: string,
): Promise<{ thread: ParsedGmailThread; mailboxEmail: string }> {
  const { thread, mailboxEmail } = await getGmailThread(threadId);

  if (
    !threadInvolvesCustomer(
      thread.messages.map((m) => ({ from: m.from, to: m.to })),
      customerEmail,
    )
  ) {
    throw new GmailIntegrationError(
      "gmail_thread_customer_mismatch",
      "Thread/customer mismatch.",
      403,
    );
  }

  return { thread, mailboxEmail };
}

export async function sendGmailReply(params: {
  threadId: string;
  customerEmail: string;
  body: string;
}): Promise<GmailSendReplyResult> {
  const body = params.body.trim();
  if (!body) {
    throw new GmailIntegrationError(
      "gmail_reply_empty",
      "Reply could not be sent.",
      400,
    );
  }
  if (body.length > GMAIL_REPLY_BODY_MAX) {
    throw new GmailIntegrationError(
      "gmail_reply_too_long",
      "Reply could not be sent.",
      400,
    );
  }

  const customerEmail = normalizeEmailAddress(params.customerEmail);
  const { thread, mailboxEmail } = await assertThreadBelongsToCustomer(
    params.threadId,
    customerEmail,
  );

  const parent = pickReplyParentMessage(thread.messages);
  if (!parent?.messageIdHeader) {
    throw new GmailIntegrationError(
      "gmail_reply_failed",
      "Reply could not be sent.",
      400,
    );
  }

  const subject = buildReplySubject(parent.subject || thread.subject);
  const references = buildReferencesHeader(
    parent.references,
    parent.messageIdHeader,
  );
  const mime = buildReplyMime({
    from: mailboxEmail,
    to: customerEmail,
    subject,
    inReplyTo: parent.messageIdHeader,
    references,
    body,
  });

  try {
    const gmail = getGmailClient();
    const { data } = await gmail.users.messages.send({
      userId: getGmailUserId(),
      requestBody: {
        raw: encodeGmailRaw(mime),
        threadId: params.threadId,
      },
    });

    const gmailMessageId = String(data.id || "");
    const responseThreadId = String(data.threadId || params.threadId);

    if (data.threadId && data.threadId !== params.threadId) {
      throw new GmailIntegrationError(
        "gmail_reply_failed",
        "Reply could not be sent.",
        502,
      );
    }

    let message: ParsedGmailMessage | null = null;
    if (gmailMessageId) {
      try {
        const refreshed = await getGmailThread(responseThreadId);
        message =
          refreshed.thread.messages.find((m) => m.gmailMessageId === gmailMessageId) ||
          null;
      } catch {
        message = null;
      }
    }

    return {
      gmailMessageId,
      threadId: responseThreadId,
      message,
    };
  } catch (error) {
    throw mapGmailApiError(error, "gmail_reply_failed", "Reply could not be sent.");
  }
}

/**
 * Load the best matching conversation for a customer email, optionally mark read.
 */
export async function getConversationForCustomerEmail(params: {
  customerEmail: string;
  markRead?: boolean;
}): Promise<{
  thread: ParsedGmailThread | null;
  mailboxEmail: string;
  candidateCount: number;
}> {
  const customerEmail = normalizeEmailAddress(params.customerEmail);
  if (!customerEmail.includes("@")) {
    throw new GmailIntegrationError(
      "customer_email_invalid",
      "Customer has no email.",
      400,
    );
  }

  const { threadId, candidateCount } = await findBestThreadIdForEmail(customerEmail);
  if (!threadId) {
    const profile = await getGmailProfile();
    return {
      thread: null,
      mailboxEmail: profile.emailAddress,
      candidateCount: 0,
    };
  }

  const { thread, mailboxEmail } = await assertThreadBelongsToCustomer(
    threadId,
    customerEmail,
  );

  if (params.markRead !== false) {
    try {
      await markThreadRead(threadId);
      // Refresh unread flags after mark-read.
      const refreshed = await getGmailThread(threadId);
      return {
        thread: refreshed.thread,
        mailboxEmail: refreshed.mailboxEmail,
        candidateCount,
      };
    } catch {
      // Still return the thread if mark-read fails; unread may remain.
      return { thread, mailboxEmail, candidateCount };
    }
  }

  return { thread, mailboxEmail, candidateCount };
}

/**
 * Bounded unread inbox scan → match known customer emails → compact notifications.
 * Metadata/snippet only; no message bodies.
 */
export async function listUnreadCustomerReplyNotifications(params: {
  emailToJob: Map<string, JobEmailCandidate>;
  limit?: number;
}): Promise<GmailNotificationsPayload> {
  if (!isGoogleGmailConfigured()) {
    return { configured: false, count: 0, items: [] };
  }

  if (params.emailToJob.size === 0) {
    return { configured: true, count: 0, items: [] };
  }

  try {
    const gmail = getGmailClient();
    const mailboxEmail = await resolveMailboxEmail(gmail);
    const userId = getGmailUserId();

    const { data: listData } = await gmail.users.messages.list({
      userId,
      q: "is:unread in:inbox",
      maxResults: GMAIL_UNREAD_SCAN_MAX,
    });

    const refs = (listData.messages || [])
      .map((m) => ({ id: String(m.id || ""), threadId: String(m.threadId || "") }))
      .filter((m) => m.id);

    const candidates: UnreadMessageCandidate[] = [];

    // Sequential gets keep Gmail quota predictable for Phase 1.
    for (const ref of refs) {
      const { data: message } = await gmail.users.messages.get({
        userId,
        id: ref.id,
        format: "metadata",
        metadataHeaders: ["From", "Subject", "Date"],
      });

      const headers = message.payload?.headers;
      const fromHeader = getHeader(headers, "From");
      const subject = getHeader(headers, "Subject");
      const receivedAt = message.internalDate
        ? new Date(Number(message.internalDate)).toISOString()
        : null;

      candidates.push({
        gmailMessageId: String(message.id || ref.id),
        gmailThreadId: String(message.threadId || ref.threadId),
        fromHeader,
        subject,
        snippet: String(message.snippet || ""),
        receivedAt,
        labelIds: Array.isArray(message.labelIds) ? message.labelIds : [],
        mailboxEmail,
      });
    }

    const built = buildCustomerReplyNotifications({
      messages: candidates,
      emailToJob: params.emailToJob,
      limit: params.limit ?? GMAIL_NOTIFICATION_ITEM_LIMIT,
    });

    return {
      configured: true,
      count: built.count,
      items: built.items,
    };
  } catch (error) {
    throw mapGmailApiError(error, "gmail_api_failed", "Gmail API request failed.");
  }
}

// Re-export parse helpers that callers/tests may need.
export {
  buildCustomerEmailSearchQuery,
  buildReplySubject,
  buildReferencesHeader,
  buildReplyMime,
  normalizeEmailAddress,
  threadInvolvesCustomer,
};
