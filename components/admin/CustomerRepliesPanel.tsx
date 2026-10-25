"use client";

import Link from "next/link";
import { useGmailNotifications } from "@/components/admin/GmailNotificationsProvider";
import { formatDateTimeNy } from "@/lib/utils/format";

export default function CustomerRepliesPanel() {
  const { configured, items, loading, error, count, refresh } =
    useGmailNotifications();

  const hasUnread = count > 0 && items.length > 0;
  const isCompactState =
    !error && (loading || items.length === 0 || !configured);

  return (
    <section
      className={`dash-panel is-primary dash-replies${hasUnread ? " is-attention" : ""}${isCompactState ? " is-compact" : ""}`}
      aria-labelledby="customer-replies-heading"
    >
      <div className="dash-panel-head dash-replies-head">
        <div>
          <div className="dash-replies-title-row">
            <h2 id="customer-replies-heading" className="dash-panel-title">
              Replies
            </h2>
            {hasUnread ? (
              <span className="dash-replies-count" aria-label={`${count} unread`}>
                {count} unread
              </span>
            ) : null}
          </div>
          {!isCompactState ? (
            <p className="dash-panel-meta">
              Unread Gmail replies from known clients
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="dash-replies-refresh"
          disabled={loading}
          onClick={() => void refresh()}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {!configured ? (
        <p className="dash-replies-status" role="status">
          <span className="dash-replies-status-label">Gmail not connected</span>
          <span className="dash-replies-status-detail">
            Connect sales@autodv8ions.com in Settings to show client replies here.
          </span>
        </p>
      ) : loading && items.length === 0 && !error ? (
        <p className="dash-replies-status is-loading" role="status" aria-live="polite">
          <span className="dash-replies-status-label">Checking inbox</span>
          <span className="dash-replies-status-detail">Scanning for unread replies…</span>
        </p>
      ) : error ? (
        <div className="dash-replies-error" role="alert">
          <p className="dash-replies-error-copy">{error}</p>
          <button
            type="button"
            className="dash-replies-refresh"
            onClick={() => void refresh()}
          >
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <p className="dash-replies-status is-clear" role="status">
          <span className="dash-replies-status-label">Inbox clear</span>
          <span className="dash-replies-status-detail">
            No unread client replies — new messages appear here automatically.
          </span>
        </p>
      ) : (
        <div className="dash-replies-rows">
          {items.map((item) => (
            <Link
              key={`${item.gmailThreadId}-${item.jobId}`}
              href={`/admin/jobs?jobId=${item.jobId}&section=communication`}
              className="dash-replies-row"
            >
              <div className="min-w-0 flex-1">
                <div className="dash-replies-identity">
                  <span className="dash-replies-unread" aria-hidden="true" />
                  <p className="dash-replies-name truncate">{item.customerName}</p>
                  <span className="sr-only">Unread</span>
                </div>
                <p className="dash-replies-subject truncate">{item.subject}</p>
                {item.preview ? (
                  <p className="dash-replies-preview">{item.preview}</p>
                ) : null}
              </div>
              <time
                className="dash-replies-time"
                dateTime={item.receivedAt || undefined}
              >
                {item.receivedAt ? formatDateTimeNy(item.receivedAt) : "—"}
              </time>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
