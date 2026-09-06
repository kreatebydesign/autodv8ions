"use client";

import { useEffect, useState } from "react";
import { useGmailNotificationsOptional } from "@/components/admin/GmailNotificationsProvider";
import {
  GMAIL_REPLY_BODY_MAX_CLIENT,
  buildGmailThreadUrl,
  displaySenderLabel,
  formatMessageTimestamp,
  getVisibleMessages,
  hasRenderablePlainBody,
} from "@/lib/google/gmail-ui";

type GmailMessage = {
  gmailMessageId: string;
  threadId: string;
  direction: "incoming" | "outgoing";
  from: string;
  to: string;
  subject: string;
  sentAt: string | null;
  plainTextBody: string;
  htmlBody: string | null;
  unread: boolean;
  hasAttachments: boolean;
};

type GmailThread = {
  id: string;
  subject: string;
  unread: boolean;
  messages: GmailMessage[];
};

type GmailConversationResponse = {
  configured?: boolean;
  customerEmail?: string | null;
  mailboxEmail?: string;
  candidateCount?: number;
  thread?: GmailThread | null;
  error?: string;
  code?: string;
};

type JobCommunicationProps = {
  jobId: string;
  customerEmail: string | null | undefined;
  disabled?: boolean;
};

export default function JobCommunication({
  jobId,
  customerEmail,
  disabled = false,
}: JobCommunicationProps) {
  const email = customerEmail?.trim() || "";
  const notifications = useGmailNotificationsOptional();

  const [loading, setLoading] = useState(Boolean(email));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(true);
  const [thread, setThread] = useState<GmailThread | null>(null);
  const [candidateCount, setCandidateCount] = useState(0);
  const [resolvedCustomerEmail, setResolvedCustomerEmail] = useState(email);

  const [showEarlier, setShowEarlier] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replyFeedback, setReplyFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [showFirstContact, setShowFirstContact] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [sendingFirstContact, setSendingFirstContact] = useState(false);
  const [firstContactFeedback, setFirstContactFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

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

      if (data.configured === false || data.code === "gmail_not_configured") {
        setConfigured(false);
        setThread(null);
        setCandidateCount(0);
        setError(null);
        return;
      }

      setConfigured(true);

      if (!res.ok) {
        setThread(null);
        setError(data.error || "Could not load Gmail conversation.");
        return;
      }

      setResolvedCustomerEmail(data.customerEmail || email);
      setCandidateCount(Number(data.candidateCount || 0));
      setThread(data.thread || null);
      setShowEarlier(false);
      // Mark-read happens server-side on GET; refresh nav badge/panel counts.
      void notifications?.refresh();
    } catch {
      setError("Could not load Gmail conversation. Check your connection and try again.");
      setThread(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    setShowEarlier(false);
    setReplyBody("");
    setReplyFeedback(null);
    setShowFirstContact(false);
    setEmailSubject("");
    setEmailMessage("");
    setFirstContactFeedback(null);
    void loadThread();
    // Reload when job or customer email changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional job-scoped reload
  }, [jobId, email]);

  async function handleSendReply() {
    if (!thread || sendingReply || disabled) return;
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
      setReplyFeedback({ type: "success", text: "Reply sent." });
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

      let data: { error?: string } = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        setFirstContactFeedback({
          type: "error",
          text: data.error || "Email failed to send.",
        });
        return;
      }

      setEmailSubject("");
      setEmailMessage("");
      setShowFirstContact(false);
      setFirstContactFeedback({
        type: "success",
        text: `Email sent to ${email}. Check Gmail or refresh after the customer replies.`,
      });
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

  const { visible, hiddenCount } = getVisibleMessages(thread?.messages || [], {
    showAll: showEarlier,
  });

  const replyTooLong = replyBody.trim().length > GMAIL_REPLY_BODY_MAX_CLIENT;
  const canSendReply =
    Boolean(thread) &&
    Boolean(replyBody.trim()) &&
    !replyTooLong &&
    !sendingReply &&
    !disabled;

  return (
    <section className="job-section job-section--comm" aria-labelledby="job-comm-heading">
      <div className="job-section-head">
        <div>
          <h2 id="job-comm-heading" className="job-section-title">
            Communication
          </h2>
          <p className="job-section-lede">
            Customer conversation for this job via sales@autodv8ions.com.
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
              Connect the AutoDV8ions Gmail mailbox on the server to view and reply
              to conversations here.
            </p>
          </div>
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
          </div>
          <button
            type="button"
            className="admin-btn"
            disabled={disabled || refreshing}
            onClick={() => void loadThread()}
          >
            Retry
          </button>
        </div>
      ) : !thread ? (
        <div className="job-comm-shell">
          <div className="job-comm-empty">
            <div>
              <p className="job-comm-empty-title">No Gmail conversation found yet</p>
              <p className="job-comm-empty-copy">
                No Gmail thread matched{" "}
                <span className="job-comm-email">{resolvedCustomerEmail || email}</span>{" "}
                yet. Start with a first-contact email, or refresh after mail exists in
                Gmail.
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

          {firstContactFeedback ? (
            <p
              className={
                firstContactFeedback.type === "success"
                  ? "job-comm-feedback is-success"
                  : "job-comm-feedback is-error"
              }
              role="status"
            >
              {firstContactFeedback.text}
            </p>
          ) : null}

          {showFirstContact ? (
            <div className="job-comm-composer">
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
                    disabled ||
                    !emailSubject.trim() ||
                    !emailMessage.trim()
                  }
                  onClick={() => void handleFirstContactSend()}
                >
                  {sendingFirstContact ? "Sending…" : "Send"}
                </button>
                <button
                  type="button"
                  className="admin-btn"
                  disabled={sendingFirstContact}
                  onClick={() => setShowFirstContact(false)}
                >
                  Close
                </button>
                <span className="job-comm-hint">
                  First-contact via Resend. Threaded replies will use Gmail once a
                  conversation exists.
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
              {candidateCount > 1 ? (
                <p className="job-comm-ambiguity" role="note">
                  Multiple Gmail conversations found. Showing the most recent.
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
              <a
                className="admin-btn"
                href={buildGmailThreadUrl(thread.id)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in Gmail
              </a>
            </div>
          </div>

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
                        {outgoing ? "Outgoing" : "Incoming"}
                      </p>
                      <p className="job-comm-message-from">
                        {displaySenderLabel(message.from, message.direction)}
                      </p>
                    </div>
                    <time
                      className="job-comm-message-time"
                      dateTime={message.sentAt || undefined}
                    >
                      {formatMessageTimestamp(message.sentAt)}
                    </time>
                  </div>
                  {plainOk ? (
                    <p className="job-comm-message-body">{message.plainTextBody}</p>
                  ) : (
                    <p className="job-comm-message-fallback">
                      This email contains HTML content. Open in Gmail to view the
                      full message.
                    </p>
                  )}
                  {message.hasAttachments ? (
                    <p className="job-comm-attachment-note">Includes attachments</p>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <div className="job-comm-reply">
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
                  Reply is too long (max {GMAIL_REPLY_BODY_MAX_CLIENT.toLocaleString()}{" "}
                  characters).
                </span>
              ) : (
                <span className="job-comm-hint">Sends through Gmail and stays in this thread.</span>
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
        </div>
      )}
    </section>
  );
}
