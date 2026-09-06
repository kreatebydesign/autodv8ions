"use client";

import Link from "next/link";
import { useGmailNotifications } from "@/components/admin/GmailNotificationsProvider";
import { formatDateTimeNy } from "@/lib/utils/format";

export default function CustomerRepliesPanel() {
  const { configured, items, loading, error, count, refresh } =
    useGmailNotifications();

  return (
    <section className="admin-panel p-5" aria-labelledby="customer-replies-heading">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="customer-replies-heading" className="text-lg font-light">
            Customer Replies
          </h2>
          <p className="mt-1 text-xs text-[var(--dv8-muted)]">
            Unread Gmail replies from known customers
            {count > 0 ? ` · ${count}` : ""}
          </p>
        </div>
        <button
          type="button"
          className="admin-btn"
          disabled={loading}
          onClick={() => void refresh()}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {!configured ? (
        <p className="text-sm text-[var(--dv8-muted)]">
          Gmail is not connected yet.
        </p>
      ) : loading && items.length === 0 && !error ? (
        <p className="text-sm text-[var(--dv8-muted)]" role="status">
          Checking for customer replies…
        </p>
      ) : error ? (
        <div className="space-y-3" role="alert">
          <p className="text-sm text-[var(--dv8-muted)]">{error}</p>
          <button
            type="button"
            className="admin-btn"
            onClick={() => void refresh()}
          >
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-[var(--dv8-muted)]">
          No unread customer replies.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Link
              key={`${item.gmailThreadId}-${item.jobId}`}
              href={`/admin/jobs?jobId=${item.jobId}&section=communication`}
              className="gmail-reply-row"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="gmail-reply-unread" aria-hidden="true" />
                  <p className="truncate text-[0.95rem] text-[#f2f2f4]">
                    {item.customerName}
                  </p>
                  <span className="sr-only">Unread</span>
                </div>
                <p className="mt-1 truncate text-sm text-[#d8d8de]">
                  {item.subject}
                </p>
                {item.preview ? (
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--dv8-muted)]">
                    {item.preview}
                  </p>
                ) : null}
              </div>
              <time
                className="shrink-0 text-xs text-[var(--dv8-muted)]"
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
