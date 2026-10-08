"use client";

import Link from "next/link";
import { useGmailNotifications } from "@/components/admin/GmailNotificationsProvider";
import { formatDateTimeNy } from "@/lib/utils/format";

export default function CustomerRepliesPanel() {
  const { configured, items, loading, error, count, refresh } =
    useGmailNotifications();

  const hasUnread = count > 0 && items.length > 0;

  return (
    <section
      className={`dash-panel is-primary dash-replies${hasUnread ? " is-attention" : ""}`}
      aria-labelledby="customer-replies-heading"
    >
      <div className="dash-panel-head">
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
          <p className="dash-panel-meta">
            Unread Gmail replies from known clients
          </p>
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
        <div className="dash-replies-empty">
          <p className="dash-replies-empty-title">Gmail not connected</p>
          <p className="dash-replies-empty-copy">
            Connect sales@autodv8ions.com in Settings to surface customer replies
            here.
          </p>
        </div>
      ) : loading && items.length === 0 && !error ? (
        <p className="dash-empty" role="status">
          Checking for replies…
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
        <div className="dash-replies-empty">
          <p className="dash-replies-empty-title">Inbox clear</p>
          <p className="dash-replies-empty-copy">
            No unread customer replies right now. New messages will appear here
            automatically.
          </p>
        </div>
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
