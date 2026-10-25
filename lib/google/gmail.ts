import { google, type gmail_v1 } from "googleapis";
import { getRequiredWorkspaceMailbox } from "@/lib/google/gmail-auth";
import {
  hasEnvGmailRefreshToken,
  loadStoredGmailCredential,
  resolveGmailRefreshToken,
} from "@/lib/google/gmail-credentials";
import {
  GmailIntegrationError,
  mapGmailApiError,
} from "@/lib/google/gmail-errors";
import { isGoogleOAuthClientConfigured } from "@/lib/google/workspace-credentials";
import type { GmailThreadCandidateSummary } from "@/lib/crm/job-gmail-conversation";
import {
  GMAIL_REPLY_BODY_MAX,
  GMAIL_THREAD_SEARCH_MAX,
  buildCustomerEmailSearchQuery,
  buildNewMessageMime,
  buildReferencesHeader,
  buildReplyMime,
  buildReplySubject,
  encodeGmailRaw,
  getHeader,
  normalizeEmailAddress,
  parseGmailThread,
  pickReplyParentMessage,
  selectBestThreadIdByLatestActivity,
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
 * Gmail OAuth — isolated from Calendar *API usage*, shares Workspace reconnect token.
 *
 * Refresh token sources (in order):
 * 1) Encrypted DB `google_workspace` credential (admin reconnect)
 * 2) Legacy encrypted DB `gmail` credential
 * 3) GOOGLE_GMAIL_REFRESH_TOKEN env (bootstrap / legacy)
 *
 * Never reads GOOGLE_REFRESH_TOKEN for Gmail API calls.
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

export { GmailIntegrationError } from "@/lib/google/gmail-errors";

export function isGoogleGmailClientConfigured() {
  return isGoogleOAuthClientConfigured();
}

/**
 * Sync gate for routes: OAuth client present and either an env refresh token
 * or Supabase (so a reconnect-stored token can be loaded asynchronously).
 */
export function isGoogleGmailConfigured() {
  if (!isGoogleGmailClientConfigured()) return false;
  if (hasEnvGmailRefreshToken()) return true;
  return Boolean(
    process.env.SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

function getGmailUserId() {
  return process.env.GOOGLE_GMAIL_USER?.trim() || "me";
}

async function getGmailOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const refreshToken = await resolveGmailRefreshToken();

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
export async function getGmailClient(): Promise<gmail_v1.Gmail> {
  const auth = await getGmailOAuthClient();
  return google.gmail({ version: "v1", auth });
}

export async function hasUsableGmailCredential(): Promise<boolean> {
  if (!isGoogleGmailClientConfigured()) return false;
  if (hasEnvGmailRefreshToken()) return true;
  const stored = await loadStoredGmailCredential();
  return Boolean(stored?.refreshToken);
}

/**
 * Lightweight connection check via users.getProfile.
 * Returns mailbox identity and aggregate counts only — no message content.
 */
export async function getGmailProfile(): Promise<GmailProfileSummary> {
  try {
    const gmail = await getGmailClient();
    const { data } = await gmail.users.getProfile({ userId: getGmailUserId() });

    const emailAddress = String(data.emailAddress || "").trim();
    if (!emailAddress) {
      throw new GmailIntegrationError(
        "gmail_api_failed",
        "Gmail API request failed.",
        502,
      );
    }

    const required = getRequiredWorkspaceMailbox();
    if (normalizeEmailAddress(emailAddress) !== required) {
      throw new GmailIntegrationError(
        "gmail_wrong_account",
        `Gmail must be connected as ${required}.`,
        401,
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
  const required = getRequiredWorkspaceMailbox();
  const { data } = await gmail.users.getProfile({ userId: getGmailUserId() });
  const email = String(data.emailAddress || "").trim();
  if (!email) {
    throw new GmailIntegrationError(
      "gmail_api_failed",
      "Gmail API request failed.",
      502,
    );
  }
  const normalized = normalizeEmailAddress(email);
  if (normalized !== required) {
    throw new GmailIntegrationError(
      "gmail_wrong_account",
      `Gmail must be connected as ${required}.`,
      401,
    );
  }
  return normalized;
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
    const gmail = await getGmailClient();
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
const GMAIL_THREAD_PICK_FULL_FETCH_MAX = 5;

export async function findBestThreadIdForEmail(
  customerEmail: string,
): Promise<{ threadId: string | null; candidateCount: number }> {
  const candidates = await findThreadsForEmail(customerEmail);
  const candidateCount = candidates.length;
  if (!candidateCount) {
    return { threadId: null, candidateCount: 0 };
  }
  if (candidateCount === 1) {
    return { threadId: candidates[0].id, candidateCount: 1 };
  }

  const toInspect = candidates.slice(0, GMAIL_THREAD_PICK_FULL_FETCH_MAX);
  const parsedThreads: ParsedGmailThread[] = [];

  for (const candidate of toInspect) {
    try {
      const { thread } = await getGmailThread(candidate.id);
      parsedThreads.push(thread);
    } catch {
      // Skip threads we cannot load; continue ranking the rest.
    }
  }

  const threadId = selectBestThreadIdByLatestActivity(
    parsedThreads,
    customerEmail,
    candidates,
  );

  return { threadId, candidateCount };
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
    const gmail = await getGmailClient();
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
    const gmail = await getGmailClient();
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
      thread.messages.map((m) => ({ from: m.from, to: m.to, cc: m.cc })),
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

export async function sendGmailReply(
  params: {
    threadId: string;
    customerEmail: string;
    body: string;
  },
  deps?: {
    getClient?: () => Promise<gmail_v1.Gmail>;
    resolveThread?: (
      threadId: string,
      customerEmail: string,
    ) => Promise<{ thread: ParsedGmailThread; mailboxEmail: string }>;
    refreshThread?: typeof getGmailThread;
  },
): Promise<GmailSendReplyResult> {
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
  const resolveThread = deps?.resolveThread ?? assertThreadBelongsToCustomer;
  const { thread, mailboxEmail } = await resolveThread(
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
    const getClient = deps?.getClient ?? getGmailClient;
    const gmail = await getClient();
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
        const refreshThread = deps?.refreshThread ?? getGmailThread;
        const refreshed = await refreshThread(responseThreadId);
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

export type GmailSendNewMessageResult = {
  gmailMessageId: string;
  threadId: string;
};

/**
 * Start a new Gmail thread to a customer from the connected mailbox.
 */
export async function sendGmailNewMessage(
  params: {
    customerEmail: string;
    subject: string;
    body: string;
  },
  deps?: {
    getClient?: () => Promise<gmail_v1.Gmail>;
    resolveMailbox?: () => Promise<string>;
  },
): Promise<GmailSendNewMessageResult> {
  const body = params.body.trim();
  const subject = params.subject.trim();
  if (!body) {
    throw new GmailIntegrationError(
      "gmail_reply_empty",
      "Message could not be sent.",
      400,
    );
  }
  if (!subject) {
    throw new GmailIntegrationError(
      "gmail_subject_missing",
      "Subject is required.",
      400,
    );
  }
  if (body.length > GMAIL_REPLY_BODY_MAX) {
    throw new GmailIntegrationError(
      "gmail_reply_too_long",
      "Message is too long.",
      400,
    );
  }

  const customerEmail = normalizeEmailAddress(params.customerEmail);
  if (!customerEmail.includes("@")) {
    throw new GmailIntegrationError(
      "customer_email_invalid",
      "Customer has no email.",
      400,
    );
  }

  const getClient = deps?.getClient ?? getGmailClient;
  const gmail = await getClient();
  const mailboxEmail = deps?.resolveMailbox
    ? await deps.resolveMailbox()
    : await resolveMailboxEmail(gmail);

  const mime = buildNewMessageMime({
    from: mailboxEmail,
    to: customerEmail,
    subject,
    body,
  });

  try {
    const { data } = await gmail.users.messages.send({
      userId: getGmailUserId(),
      requestBody: {
        raw: encodeGmailRaw(mime),
      },
    });

    const gmailMessageId = String(data.id || "").trim();
    const threadId = String(data.threadId || "").trim();
    if (!gmailMessageId || !threadId) {
      throw new GmailIntegrationError(
        "gmail_reply_failed",
        "Gmail did not confirm the send.",
        502,
      );
    }

    return { gmailMessageId, threadId };
  } catch (error) {
    throw mapGmailApiError(error, "gmail_reply_failed", "Message could not be sent.");
  }
}

const GMAIL_CANDIDATE_PREVIEW_MAX = 5;

/**
 * List Gmail thread candidates for manual linking (no auto-selection).
 */
export async function listThreadCandidatesForCustomerEmail(
  customerEmail: string,
): Promise<{
  candidates: GmailThreadCandidateSummary[];
  candidateCount: number;
  mailboxEmail: string;
}> {
  const normalized = normalizeEmailAddress(customerEmail);
  if (!normalized.includes("@")) {
    throw new GmailIntegrationError(
      "customer_email_invalid",
      "Customer has no email.",
      400,
    );
  }

  const listed = await findThreadsForEmail(normalized);
  const candidateCount = listed.length;
  const preview = listed.slice(0, GMAIL_CANDIDATE_PREVIEW_MAX);
  const candidates: GmailThreadCandidateSummary[] = [];

  for (const item of preview) {
    try {
      const { thread } = await getGmailThread(item.id);
      const parties = thread.messages.map((m) => ({
        from: m.from,
        to: m.to,
        cc: m.cc,
      }));
      if (!threadInvolvesCustomer(parties, normalized)) continue;

      const last = thread.messages[thread.messages.length - 1];
      candidates.push({
        id: thread.id,
        subject: thread.subject,
        snippet: item.snippet || last?.plainTextBody?.slice(0, 120) || "",
        messageCount: thread.messages.length,
        lastActivityIso: last?.sentAt || null,
      });
    } catch {
      // Skip threads we cannot load.
    }
  }

  const profile = await getGmailProfile();
  return {
    candidates,
    candidateCount,
    mailboxEmail: profile.emailAddress,
  };
}

/**
 * Load a job-linked Gmail thread after server-side customer participation checks.
 */
export async function getConversationForLinkedThread(params: {
  threadId: string;
  customerEmail: string;
  markRead?: boolean;
}): Promise<{
  thread: ParsedGmailThread;
  mailboxEmail: string;
}> {
  const customerEmail = normalizeEmailAddress(params.customerEmail);
  const threadId = params.threadId.trim();
  if (!threadId) {
    throw new GmailIntegrationError(
      "gmail_thread_missing",
      "Thread no longer exists.",
      404,
    );
  }

  const { thread, mailboxEmail } = await assertThreadBelongsToCustomer(
    threadId,
    customerEmail,
  );

  if (params.markRead === false) {
    return { thread, mailboxEmail };
  }

  try {
    await markThreadRead(threadId);
    const refreshed = await getGmailThread(threadId);
    return { thread: refreshed.thread, mailboxEmail: refreshed.mailboxEmail };
  } catch {
    return { thread, mailboxEmail };
  }
}

/**
 * Load the best matching conversation for a customer email, optionally mark read.
 * @deprecated Prefer explicit job links + listThreadCandidatesForCustomerEmail.
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
  threadIdToJobId?: Map<string, string>;
  jobsById?: Map<string, JobEmailCandidate>;
  ambiguousActiveEmails?: Set<string>;
  limit?: number;
}): Promise<GmailNotificationsPayload> {
  if (!isGoogleGmailConfigured()) {
    return { configured: false, count: 0, items: [] };
  }

  if (params.emailToJob.size === 0) {
    return { configured: true, count: 0, items: [] };
  }

  try {
    const gmail = await getGmailClient();
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
      threadIdToJobId: params.threadIdToJobId,
      jobsById: params.jobsById,
      ambiguousActiveEmails: params.ambiguousActiveEmails,
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
