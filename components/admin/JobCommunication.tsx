"use client";

import { useEffect, useState } from "react";
import EmailTemplatePicker from "@/components/admin/EmailTemplatePicker";
import { useGmailNotificationsOptional } from "@/components/admin/GmailNotificationsProvider";
import {
  GMAIL_REPLY_BODY_MAX_CLIENT,
  buildGoogleWorkspaceReconnectHref,
  buildGmailThreadUrl,
  formatMessageParties,
  formatMessageTimestamp,
  getMessageBodyText,
  getVisibleMessages,
  hasRenderablePlainBody,
  isGmailAuthorizationErrorCode,
  isGmailTemporaryErrorCode,
} from "@/lib/google/gmail-ui";
import JobMessageBody from "@/components/admin/JobMessageBody";

type GmailMessage = {
  gmailMessageId: string;
  threadId: string;
  direction: "incoming" | "outgoing";
  from: string;
  to: string;
  cc: string;
  subject: string;
  sentAt: string | null;
  plainTextBody: string;
  htmlBody: string | null;
  unread: boolean;
  hasAttachments: boolean;
  source?: "gmail" | "resend";
};

type GmailThread = {
  id: string;
  subject: string;
  unread: boolean;
  messages: GmailMessage[];
};

type GmailThreadCandidate = {
  id: string;
  subject: string;
  snippet: string;
  messageCount: number;
  lastActivityIso: string | null;
};

type JobGmailLinkWarning = {
  code: "linked_email_mismatch" | "linked_thread_participation";
  message: string;
  linkedEmail?: string;
  currentEmail?: string;
};

type GmailConversationResponse = {
  configured?: boolean;
  customerEmail?: string | null;
  mailboxEmail?: string;
  candidateCount?: number;
  threadCandidates?: GmailThreadCandidate[];
  linkedThreadId?: string | null;
  requiresLinkSelection?: boolean;
  linkWarning?: JobGmailLinkWarning | null;
  thread?: GmailThread | null;
  error?: string;
  code?: string;
};

function firstContactFeedbackClass(type: "success" | "error" | "warn") {
  if (type === "success") return "job-comm-feedback is-success";
  if (type === "warn") return "job-comm-feedback is-warn";
  return "job-comm-feedback is-error";
}

type JobCommunicationProps = {
  jobId: string;
  customerEmail: string | null | undefined;
  disabled?: boolean;
  reviewUrl?: string | null;
  bootstrapFirstContact?: { subject: string; message: string } | null;
  pendingReviewRequest?: boolean;
  onReviewSendSuccess?: () => void;
};

export default function JobCommunication({
  jobId,
  customerEmail,
  disabled = false,
  reviewUrl = null,
  bootstrapFirstContact = null,
  pendingReviewRequest = false,
  onReviewSendSuccess,
}: JobCommunicationProps) {
  const email = customerEmail?.trim() || "";
  const notifications = useGmailNotificationsOptional();

  const [loading, setLoading] = useState(Boolean(email));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [configured, setConfigured] = useState(true);
  const [thread, setThread] = useState<GmailThread | null>(null);
  const [candidateCount, setCandidateCount] = useState(0);
  const [threadCandidates, setThreadCandidates] = useState<GmailThreadCandidate[]>(
    [],
  );
  const [linkedThreadId, setLinkedThreadId] = useState<string | null>(null);
  const [requiresLinkSelection, setRequiresLinkSelection] = useState(false);
  const [linkWarning, setLinkWarning] = useState<JobGmailLinkWarning | null>(
    null,
  );
  const [linkingThreadId, setLinkingThreadId] = useState<string | null>(null);
  const [unlinking, setUnlinking] = useState(false);
  const [resolvedCustomerEmail, setResolvedCustomerEmail] = useState(email);

  const [showEarlier, setShowEarlier] = useState(false);
  const [replyBody, setReplyBody] = useState(
    () => bootstrapFirstContact?.message ?? "",
  );
  const [sendingReply, setSendingReply] = useState(false);
  const [replyFeedback, setReplyFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [showFirstContact, setShowFirstContact] = useState(
    () => Boolean(bootstrapFirstContact),
  );
  const [emailSubject, setEmailSubject] = useState(
    () => bootstrapFirstContact?.subject ?? "",
  );
  const [emailMessage, setEmailMessage] = useState(
    () => bootstrapFirstContact?.message ?? "",
  );
  const [sendingFirstContact, setSendingFirstContact] = useState(false);
  const [sendingGmailFirst, setSendingGmailFirst] = useState(false);
  const [firstContactFeedback, setFirstContactFeedback] = useState<{
    type: "success" | "error" | "warn";
    text: string;
  } | null>(null);
  const [pendingResendMessageId, setPendingResendMessageId] = useState<
    string | null
  >(null);
  const [savingOutboundLog, setSavingOutboundLog] = useState(false);

  async function loadThread(options?: { soft?: boolean }) {
    if (!email) {
      setLoading(false);
      setThread(null);
      setError(null);
      return;
    }

    if (options?.soft) setRefreshing(true);
    else setLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      const res = await fetch(`/api/jobs/${jobId}/gmail`, {
        credentials: "include",
        cache: "no-store",
      });

      let data: GmailConversationResponse = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      const hasLocalThread = Boolean(data.thread?.messages?.length);
      if (
        (data.configured === false || data.code === "gmail_not_configured") &&
        !hasLocalThread
      ) {
        setConfigured(false);
        setThread(null);
        setCandidateCount(0);
        setError(null);
        setErrorCode(null);
        return;
      }

      setConfigured(data.configured !== false);

      if (!res.ok && !hasLocalThread) {
        setThread(null);
        setError(data.error || "Could not load Gmail conversation.");
        setErrorCode(data.code || "gmail_api_failed");
        return;
      }

      setResolvedCustomerEmail(data.customerEmail || email);
      setCandidateCount(Number(data.candidateCount || 0));
      setThreadCandidates(data.threadCandidates || []);
      setLinkedThreadId(data.linkedThreadId || null);
      setRequiresLinkSelection(Boolean(data.requiresLinkSelection));
      setLinkWarning(data.linkWarning || null);
      setThread(data.thread || null);
      if (
        bootstrapFirstContact &&
        data.thread?.id &&
        !String(data.thread.id).startsWith("local-")
      ) {
        setReplyBody(bootstrapFirstContact.message);
        setShowFirstContact(false);
      }
      if (hasLocalThread && data.error) {
        setError(data.error);
        setErrorCode(data.code || null);
      }
      setShowEarlier(false);
      setErrorCode(null);
      // Mark-read happens server-side on GET; refresh nav badge/panel counts.
      void notifications?.refresh();
    } catch {
      setError("Could not load Gmail conversation. Check your connection and try again.");
      setErrorCode("gmail_temporarily_unavailable");
      setThread(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    // Async Gmail load; setState occurs inside loadThread after await boundaries.
    // Parent remounts with key={jobId} so draft UI resets without sync effect resets.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external mailbox fetch on job change
    void loadThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional job-scoped reload
  }, [jobId, email]);

  async function handleLinkThread(threadId: string) {
    if (!threadId || linkingThreadId || disabled) return;
    setLinkingThreadId(threadId);
    try {
      const res = await fetch(`/api/jobs/${jobId}/gmail/link`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not link conversation.");
        setErrorCode(data.code || "link_failed");
        return;
      }
      await loadThread({ soft: true });
    } catch {
      setError("Could not link conversation. Check your connection and try again.");
      setErrorCode("link_failed");
    } finally {
      setLinkingThreadId(null);
    }
  }

  async function handleUnlinkThread() {
    if (unlinking || disabled || !linkedThreadId) return;
    setUnlinking(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/gmail/link`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not unlink conversation.");
        setErrorCode(data.code || "unlink_failed");
        return;
      }
      await loadThread({ soft: true });
    } catch {
      setError("Could not unlink conversation. Check your connection and try again.");
      setErrorCode("unlink_failed");
    } finally {
      setUnlinking(false);
    }
  }

  async function handleSendReply() {
    if (!thread || sendingReply || disabled) return;
    if (thread.id.startsWith("local-")) return;
    const body = replyBody.trim();
    if (!body || body.length > GMAIL_REPLY_BODY_MAX_CLIENT) return;

    setSendingReply(true);
    setReplyFeedback(null);

    try {
      const res = await fetch(`/api/jobs/${jobId}/gmail/reply`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: thread.id, body }),
      });

      let data: { error?: string; success?: boolean } = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        setReplyFeedback({
          type: "error",
          text: data.error || "Reply could not be sent.",
        });
        return;
      }

      setReplyBody("");
      setReplyFeedback({
        type: "success",
        text:
          (data as { duplicatePrevented?: boolean }).duplicatePrevented
            ? "Reply already sent — thread refreshed."
            : "Reply sent via Gmail.",
      });
      if (pendingReviewRequest && onReviewSendSuccess) {
        onReviewSendSuccess();
      }
      await loadThread({ soft: true });
    } catch {
      setReplyFeedback({
        type: "error",
        text: "Reply could not be sent. Check your connection and try again.",
      });
    } finally {
      setSendingReply(false);
    }
  }

  async function handleGmailFirstSend() {
    if (!email || sendingGmailFirst || disabled || linkedThreadId) return;
    const subject = emailSubject.trim();
    const message = emailMessage.trim();
    if (!subject || !message) return;

    setSendingGmailFirst(true);
    setFirstContactFeedback(null);

    try {
      const res = await fetch(`/api/jobs/${jobId}/gmail/send`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 202) {
        setFirstContactFeedback({
          type: "error",
          text: data.error || "Gmail message could not be sent.",
        });
        return;
      }

      if (data.warning) {
        setFirstContactFeedback({
          type: "warn",
          text: data.warning,
        });
      } else {
        setEmailSubject("");
        setEmailMessage("");
        setShowFirstContact(false);
        setFirstContactFeedback({
          type: "success",
          text: data.duplicatePrevented
            ? "This message was already sent recently. Thread refreshed."
            : "Sent via Gmail and linked to this job.",
        });
      }
      if (pendingReviewRequest && onReviewSendSuccess && data.linked) {
        onReviewSendSuccess();
      }
      await loadThread({ soft: true });
    } catch {
      setFirstContactFeedback({
        type: "error",
        text: "Gmail message could not be sent. Check your connection and try again.",
      });
    } finally {
      setSendingGmailFirst(false);
    }
  }

  async function handleFirstContactSend() {
    if (!email || sendingFirstContact || disabled) return;
    const subject = emailSubject.trim();
    const message = emailMessage.trim();
    if (!subject || !message) return;

    setSendingFirstContact(true);
    setFirstContactFeedback(null);

    try {
      const res = await fetch(`/api/jobs/${jobId}/email`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email, subject, message }),
      });

      let data: {
        error?: string;
        delivered?: boolean;
        logged?: boolean;
        warning?: string | null;
        resendMessageId?: string | null;
        duplicatePrevented?: boolean;
      } = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok && res.status !== 202) {
        setFirstContactFeedback({
          type: "error",
          text: data.error || "Email failed to send.",
        });
        return;
      }

      if (data.logged === false) {
        setPendingResendMessageId(data.resendMessageId || null);
        setFirstContactFeedback({
          type: "warn",
          text:
            data.warning ||
            "Email was sent, but it is not on this thread yet. Use Save to thread — do not send again.",
        });
        return;
      }

      setPendingResendMessageId(null);
      setEmailSubject("");
      setEmailMessage("");
      setShowFirstContact(false);
      setFirstContactFeedback({
        type: "success",
        text: data.duplicatePrevented
          ? "This message was already sent recently. Thread refreshed."
          : `Email sent and saved on this job thread.`,
      });
      if (pendingReviewRequest && onReviewSendSuccess) {
        onReviewSendSuccess();
      }
      await loadThread({ soft: true });
    } catch {
      setFirstContactFeedback({
        type: "error",
        text: "Email failed to send. Check your connection and try again.",
      });
    } finally {
      setSendingFirstContact(false);
    }
  }

  async function handleSaveOutboundLog() {
    if (!email || savingOutboundLog || disabled) return;
    const subject = emailSubject.trim();
    const message = emailMessage.trim();
    if (!subject || !message) return;
    if (!pendingResendMessageId) {
      setFirstContactFeedback({
        type: "error",
        text: "Nothing to save. Send the email first or refresh the page.",
      });
      return;
    }

    setSavingOutboundLog(true);
    setFirstContactFeedback(null);

    try {
      const res = await fetch(`/api/jobs/${jobId}/email`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email,
          subject,
          message,
          logOnly: true,
          resendMessageId: pendingResendMessageId,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.logged === false) {
        setFirstContactFeedback({
          type: "error",
          text:
            data.error ||
            "Could not save to thread. Try again shortly or contact support.",
        });
        return;
      }

      setPendingResendMessageId(null);
      setEmailSubject("");
      setEmailMessage("");
      setShowFirstContact(false);
      setFirstContactFeedback({
        type: "success",
        text: "Saved on this job thread.",
      });
      if (pendingReviewRequest && onReviewSendSuccess) {
        onReviewSendSuccess();
      }
      await loadThread({ soft: true });
    } catch {
      setFirstContactFeedback({
        type: "error",
        text: "Could not save to thread. Check your connection and try again.",
      });
    } finally {
      setSavingOutboundLog(false);
    }
  }

  const { visible, hiddenCount } = getVisibleMessages(thread?.messages || [], {
    showAll: showEarlier,
  });

  const replyTooLong = replyBody.trim().length > GMAIL_REPLY_BODY_MAX_CLIENT;
  const isLocalOnlyThread = Boolean(thread?.id?.startsWith("local-"));
  const canSendReply =
    Boolean(linkedThreadId) &&
    Boolean(thread) &&
    !isLocalOnlyThread &&
    Boolean(replyBody.trim()) &&
    !replyTooLong &&
    !sendingReply &&
    !disabled;

  const needsReconnect = isGmailAuthorizationErrorCode(errorCode);
  const canRetry = isGmailTemporaryErrorCode(errorCode);
  const reconnectHref = buildGoogleWorkspaceReconnectHref(
    `/admin/jobs?jobId=${jobId}`,
  );

  return (
    <section className="job-section job-section--comm" aria-labelledby="job-comm-heading">
      <div className="job-section-head">
        <div>
          <h2 id="job-comm-heading" className="job-section-title">
            Messages
          </h2>
          <p className="job-section-lede">
            Conversation for this job via sales@autodv8ions.com.
          </p>
        </div>
      </div>

      {!email ? (
        <div className="job-comm-empty" role="status">
          <div>
            <p className="job-comm-empty-title">No customer email on this job</p>
            <p className="job-comm-empty-copy">
              Add a customer email to load Gmail conversation for this job.
            </p>
          </div>
        </div>
      ) : !configured ? (
        <div className="job-comm-empty" role="status">
          <div>
            <p className="job-comm-empty-title">Gmail is not connected</p>
            <p className="job-comm-empty-copy">
              Connect the shop Gmail mailbox to view and reply to conversations
              here.
            </p>
          </div>
          <a
            className="admin-btn admin-btn-primary"
            href={reconnectHref}
            aria-disabled={disabled ? true : undefined}
            onClick={(event) => {
              if (disabled) event.preventDefault();
            }}
          >
            Reconnect Google Workspace
          </a>
        </div>
      ) : loading ? (
        <div className="job-comm-loading" role="status" aria-live="polite">
          <div className="job-comm-skeleton" />
          <div className="job-comm-skeleton job-comm-skeleton--short" />
          <p className="job-comm-loading-label">Loading conversation…</p>
        </div>
      ) : error ? (
        <div className="job-comm-empty" role="alert">
          <div>
            <p className="job-comm-empty-title">Could not load conversation</p>
            <p className="job-comm-empty-copy">{error}</p>
            {needsReconnect ? (
              <p className="job-comm-empty-copy">
                Sign in with sales@autodv8ions.com when Google asks which account to
                connect. This reconnects Gmail and Calendar together.
              </p>
            ) : null}
          </div>
          <div className="job-comm-empty-actions">
            {needsReconnect ? (
              <a
                className="admin-btn admin-btn-primary"
                href={reconnectHref}
                aria-disabled={disabled ? true : undefined}
                onClick={(event) => {
                  if (disabled) event.preventDefault();
                }}
              >
                Reconnect Google Workspace
              </a>
            ) : null}
            {canRetry ? (
              <button
                type="button"
                className="admin-btn"
                disabled={disabled || refreshing}
                onClick={() => void loadThread()}
              >
                Retry
              </button>
            ) : null}
          </div>
        </div>
      ) : !thread ? (
        <div className="job-comm-shell">
          <div className="job-comm-empty">
            <div>
              <p className="job-comm-empty-title">
                {requiresLinkSelection
                  ? "Choose a Gmail conversation"
                  : "No Gmail conversation found yet"}
              </p>
              <p className="job-comm-empty-copy">
                {requiresLinkSelection
                  ? "Multiple conversations may exist for this customer. Link the correct thread to this job — we never guess across jobs."
                  : (
                    <>
                      No Gmail thread matched{" "}
                      <span className="job-comm-email">
                        {resolvedCustomerEmail || email}
                      </span>{" "}
                      yet. Start with a first-contact email, or refresh after mail
                      exists in Gmail.
                    </>
                    )}
              </p>
            </div>
            <div className="job-comm-empty-actions">
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                disabled={disabled}
                onClick={() => setShowFirstContact((open) => !open)}
              >
                {showFirstContact ? "Hide Email" : "Email Customer"}
              </button>
              <button
                type="button"
                className="admin-btn"
                disabled={disabled || refreshing}
                onClick={() => void loadThread({ soft: true })}
              >
                {refreshing ? "Refreshing…" : "Refresh"}
              </button>
            </div>
          </div>

          {requiresLinkSelection && threadCandidates.length > 0 ? (
            <div className="job-comm-picker" role="region" aria-label="Gmail conversations">
              <p className="job-comm-picker-lede">
                {candidateCount > threadCandidates.length
                  ? `Showing ${threadCandidates.length} of ${candidateCount} conversations`
                  : `${candidateCount} conversation${candidateCount === 1 ? "" : "s"} found`}
              </p>
              <ul className="job-comm-picker-list">
                {threadCandidates.map((candidate) => (
                  <li key={candidate.id} className="job-comm-picker-item">
                    <div className="job-comm-picker-copy">
                      <p className="job-comm-picker-subject">
                        {candidate.subject || "(no subject)"}
                      </p>
                      {candidate.snippet ? (
                        <p className="job-comm-picker-snippet">{candidate.snippet}</p>
                      ) : null}
                      <p className="job-comm-picker-meta">
                        {candidate.messageCount} message
                        {candidate.messageCount === 1 ? "" : "s"}
                        {candidate.lastActivityIso
                          ? ` · ${formatMessageTimestamp(candidate.lastActivityIso)}`
                          : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="admin-btn admin-btn-primary"
                      disabled={disabled || linkingThreadId !== null}
                      onClick={() => void handleLinkThread(candidate.id)}
                    >
                      {linkingThreadId === candidate.id ? "Linking…" : "Link to job"}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {firstContactFeedback ? (
            <p
              className={firstContactFeedbackClass(firstContactFeedback.type)}
              role="status"
            >
              {firstContactFeedback.text}
            </p>
          ) : null}

          {showFirstContact ? (
            <div className="job-comm-composer">
              <EmailTemplatePicker
                idPrefix={`job-comm-first-${jobId}`}
                reviewUrl={reviewUrl}
                disabled={sendingFirstContact || disabled}
                hasDraft={Boolean(emailSubject.trim() || emailMessage.trim())}
                onApply={(subject, body) => {
                  setEmailSubject(subject);
                  setEmailMessage(body);
                }}
              />
              <div>
                <label className="admin-label" htmlFor={`job-comm-first-to-${jobId}`}>
                  To
                </label>
                <input
                  id={`job-comm-first-to-${jobId}`}
                  className="admin-input"
                  type="email"
                  value={email}
                  readOnly
                  aria-readonly="true"
                />
              </div>
              <div>
                <label
                  className="admin-label"
                  htmlFor={`job-comm-first-subject-${jobId}`}
                >
                  Subject
                </label>
                <input
                  id={`job-comm-first-subject-${jobId}`}
                  className="admin-input"
                  type="text"
                  value={emailSubject}
                  disabled={sendingFirstContact || disabled}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Subject"
                />
              </div>
              <div>
                <label
                  className="admin-label"
                  htmlFor={`job-comm-first-message-${jobId}`}
                >
                  Message
                </label>
                <textarea
                  id={`job-comm-first-message-${jobId}`}
                  className="admin-input job-comm-textarea"
                  value={emailMessage}
                  disabled={sendingFirstContact || disabled}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  placeholder="Write your message…"
                />
              </div>
              <div className="job-comm-composer-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  disabled={
                    sendingFirstContact ||
                    savingOutboundLog ||
                    disabled ||
                    Boolean(pendingResendMessageId) ||
                    !emailSubject.trim() ||
                    !emailMessage.trim()
                  }
                  onClick={() => void handleFirstContactSend()}
                >
                  {sendingFirstContact ? "Sending…" : "Send"}
                </button>
                {pendingResendMessageId ? (
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary"
                    disabled={
                      savingOutboundLog ||
                      disabled ||
                      !emailSubject.trim() ||
                      !emailMessage.trim()
                    }
                    onClick={() => void handleSaveOutboundLog()}
                  >
                    {savingOutboundLog ? "Saving…" : "Save to thread"}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="admin-btn"
                  disabled={sendingFirstContact || savingOutboundLog}
                  onClick={() => setShowFirstContact(false)}
                >
                  Close
                </button>
                {configured && !linkedThreadId ? (
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary"
                    disabled={
                      sendingGmailFirst ||
                      sendingFirstContact ||
                      disabled ||
                      !emailSubject.trim() ||
                      !emailMessage.trim()
                    }
                    onClick={() => void handleGmailFirstSend()}
                  >
                    {sendingGmailFirst ? "Sending via Gmail…" : "Send via Gmail"}
                  </button>
                ) : null}
                <span className="job-comm-hint">
                  Resend remains available for legacy first-contact. Gmail send
                  links the new thread to this job automatically.
                </span>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="job-comm-thread">
          <div className="job-comm-header">
            <div className="job-comm-header-copy">
              <p className="job-comm-email">{resolvedCustomerEmail || email}</p>
              <p className="job-comm-subject">{thread.subject || "(no subject)"}</p>
              <p className="job-comm-meta">
                <span>{thread.messages.length} messages</span>
                <span aria-hidden="true"> · </span>
                <span>{thread.unread ? "Unread in Gmail" : "Read"}</span>
              </p>
              {linkWarning ? (
                <p className="job-comm-link-warning" role="note">
                  {linkWarning.message}
                </p>
              ) : null}
              {requiresLinkSelection ? (
                <p className="job-comm-ambiguity" role="note">
                  Gmail messages stay hidden until you link a conversation to this job.
                </p>
              ) : null}
            </div>
            <div className="job-comm-header-actions">
              <button
                type="button"
                className="admin-btn"
                disabled={disabled || refreshing || sendingReply}
                onClick={() => void loadThread({ soft: true })}
                aria-label="Refresh conversation"
              >
                {refreshing ? "Refreshing…" : "Refresh"}
              </button>
              {!isLocalOnlyThread ? (
                <a
                  className="admin-btn"
                  href={buildGmailThreadUrl(thread.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open in Gmail
                </a>
              ) : null}
              {linkedThreadId ? (
                <button
                  type="button"
                  className="admin-btn"
                  disabled={disabled || unlinking}
                  onClick={() => void handleUnlinkThread()}
                >
                  {unlinking ? "Unlinking…" : "Unlink"}
                </button>
              ) : null}
            </div>
          </div>

          {requiresLinkSelection && threadCandidates.length > 0 ? (
            <div className="job-comm-picker job-comm-picker--inline" role="region" aria-label="Link Gmail conversation">
              <p className="job-comm-picker-lede">Link a Gmail conversation to load messages on this job.</p>
              <ul className="job-comm-picker-list">
                {threadCandidates.map((candidate) => (
                  <li key={candidate.id} className="job-comm-picker-item">
                    <div className="job-comm-picker-copy">
                      <p className="job-comm-picker-subject">
                        {candidate.subject || "(no subject)"}
                      </p>
                      {candidate.snippet ? (
                        <p className="job-comm-picker-snippet">{candidate.snippet}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="admin-btn admin-btn-primary"
                      disabled={disabled || linkingThreadId !== null}
                      onClick={() => void handleLinkThread(candidate.id)}
                    >
                      {linkingThreadId === candidate.id ? "Linking…" : "Link"}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {hiddenCount > 0 ? (
            <button
              type="button"
              className="job-comm-earlier"
              onClick={() => setShowEarlier(true)}
            >
              Show {hiddenCount} earlier message{hiddenCount === 1 ? "" : "s"}
            </button>
          ) : null}

          <ul className="job-comm-messages" aria-label="Conversation messages">
            {visible.map((message) => {
              const outgoing = message.direction === "outgoing";
              const plainOk = hasRenderablePlainBody(message);
              const bodyText = getMessageBodyText(message);
              const parties = formatMessageParties(message);
              return (
                <li
                  key={message.gmailMessageId}
                  className={
                    outgoing
                      ? "job-comm-message is-outgoing"
                      : "job-comm-message is-incoming"
                  }
                >
                  <div className="job-comm-message-head">
                    <div>
                      <p className="job-comm-message-direction">
                        {outgoing ? "Sent" : "Received"}
                        {message.source === "resend" ? " · Resend" : ""}
                      </p>
                      <p className="job-comm-message-from">
                        {outgoing
                          ? `To ${parties.to}`
                          : `From ${parties.from}`}
                      </p>
                      {message.subject?.trim() ? (
                        <p className="job-comm-message-subject">{message.subject}</p>
                      ) : null}
                    </div>
                    <time
                      className="job-comm-message-time"
                      dateTime={message.sentAt || undefined}
                    >
                      {formatMessageTimestamp(message.sentAt)}
                    </time>
                  </div>
                  {plainOk ? (
                    <JobMessageBody
                      bodyText={bodyText}
                      messageId={message.gmailMessageId}
                    />
                  ) : (
                    <p className="job-comm-message-fallback">
                      No readable message body. Open in Gmail to view the full
                      email.
                    </p>
                  )}
                  {message.hasAttachments ? (
                    <p className="job-comm-attachment-note">Includes attachments</p>
                  ) : null}
                </li>
              );
            })}
          </ul>

          {isLocalOnlyThread ? (
            <div className="job-comm-reply">
              <p className="job-comm-hint">
                Replies will use Gmail after the customer responds and a thread
                exists. Until then, send another message with Resend.
              </p>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                disabled={disabled}
                onClick={() => setShowFirstContact((open) => !open)}
              >
                {showFirstContact ? "Hide composer" : "Email customer"}
              </button>
              {showFirstContact ? (
                <div className="job-comm-composer mt-4">
                  <EmailTemplatePicker
                    idPrefix={`job-comm-inline-${jobId}`}
                    reviewUrl={reviewUrl}
                    disabled={sendingFirstContact || disabled}
                    hasDraft={Boolean(emailSubject.trim() || emailMessage.trim())}
                    onApply={(subject, body) => {
                      setEmailSubject(subject);
                      setEmailMessage(body);
                    }}
                  />
                  <div>
                    <label
                      className="admin-label"
                      htmlFor={`job-comm-inline-subject-${jobId}`}
                    >
                      Subject
                    </label>
                    <input
                      id={`job-comm-inline-subject-${jobId}`}
                      className="admin-input"
                      type="text"
                      value={emailSubject}
                      disabled={sendingFirstContact || disabled}
                      onChange={(e) => setEmailSubject(e.target.value)}
                    />
                  </div>
                  <div>
                    <label
                      className="admin-label"
                      htmlFor={`job-comm-inline-message-${jobId}`}
                    >
                      Message
                    </label>
                    <textarea
                      id={`job-comm-inline-message-${jobId}`}
                      className="admin-input job-comm-textarea"
                      value={emailMessage}
                      disabled={sendingFirstContact || disabled}
                      onChange={(e) => setEmailMessage(e.target.value)}
                    />
                  </div>
                  <div className="job-comm-composer-actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn-primary"
                      disabled={
                        sendingFirstContact ||
                        savingOutboundLog ||
                        disabled ||
                        Boolean(pendingResendMessageId) ||
                        !emailSubject.trim() ||
                        !emailMessage.trim()
                      }
                      onClick={() => void handleFirstContactSend()}
                    >
                      {sendingFirstContact ? "Sending…" : "Send"}
                    </button>
                    {pendingResendMessageId ? (
                      <button
                        type="button"
                        className="admin-btn admin-btn-primary"
                        disabled={
                          savingOutboundLog ||
                          disabled ||
                          !emailSubject.trim() ||
                          !emailMessage.trim()
                        }
                        onClick={() => void handleSaveOutboundLog()}
                      >
                        {savingOutboundLog ? "Saving…" : "Save to thread"}
                      </button>
                    ) : null}
                  </div>
                  {firstContactFeedback ? (
                    <p
                      className={firstContactFeedbackClass(
                        firstContactFeedback.type,
                      )}
                      role="status"
                    >
                      {firstContactFeedback.text}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="job-comm-reply">
              <EmailTemplatePicker
                idPrefix={`job-comm-reply-${jobId}`}
                reviewUrl={reviewUrl}
                disabled={sendingReply || disabled}
                hasDraft={Boolean(replyBody.trim())}
                onApply={(_subject, body) => {
                  setReplyBody(body);
                  if (replyFeedback) setReplyFeedback(null);
                }}
              />
              <label className="admin-label" htmlFor={`job-comm-reply-${jobId}`}>
                Reply
              </label>
              <textarea
                id={`job-comm-reply-${jobId}`}
                className="admin-input job-comm-textarea"
                value={replyBody}
                disabled={sendingReply || disabled}
                onChange={(e) => {
                  setReplyBody(e.target.value);
                  if (replyFeedback) setReplyFeedback(null);
                }}
                placeholder="Write a reply…"
                rows={5}
              />
              <div className="job-comm-composer-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  disabled={!canSendReply}
                  onClick={() => void handleSendReply()}
                >
                  {sendingReply ? "Sending…" : "Send Reply"}
                </button>
                {replyTooLong ? (
                  <span className="job-comm-hint is-warn" role="status">
                    Reply is too long (max{" "}
                    {GMAIL_REPLY_BODY_MAX_CLIENT.toLocaleString()} characters).
                  </span>
                ) : !linkedThreadId ? (
                  <span className="job-comm-hint is-warn" role="status">
                    Link a Gmail conversation before replying in-thread.
                  </span>
                ) : (
                  <span className="job-comm-hint">
                    Sends through Gmail and stays in this thread.
                  </span>
                )}
              </div>
              {replyFeedback ? (
                <p
                  className={
                    replyFeedback.type === "success"
                      ? "job-comm-feedback is-success"
                      : "job-comm-feedback is-error"
                  }
                  role="status"
                >
                  {replyFeedback.text}
                </p>
              ) : null}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
