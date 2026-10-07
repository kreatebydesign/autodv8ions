"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useGmailNotifications } from "@/components/admin/GmailNotificationsProvider";
import { formatDateTimeNy } from "@/lib/utils/format";

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 3.75c-2.9 0-5.25 2.24-5.25 5v2.1c0 .74-.24 1.46-.68 2.06L4.7 14.9c-.7.95-.02 2.3 1.16 2.3h12.28c1.18 0 1.86-1.35 1.16-2.3l-1.37-1.99a3.4 3.4 0 0 1-.68-2.06V8.75c0-2.76-2.35-5-5.25-5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M9.75 17.2a2.4 2.4 0 0 0 4.5 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

type AdminNotificationsProps = {
  /** Where the control is mounted — drives desktop/mobile CSS visibility. */
  placement?: "dashboard" | "mobile";
};

export default function AdminNotifications({
  placement = "dashboard",
}: AdminNotificationsProps) {
  const { configured, count, items, loading, error, badgeLabel, refresh } =
    useGmailNotifications();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const hasUnread = count > 0;

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | PointerEvent) {
      const root = rootRef.current;
      if (!root) return;
      if (event.target instanceof Node && !root.contains(event.target)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const ariaLabel = hasUnread
    ? `Customer replies, ${badgeLabel || count} unread`
    : "Customer replies, no unread";

  return (
    <div
      ref={rootRef}
      className={`dash-notify dash-notify--${placement}${hasUnread ? " is-active" : ""}${open ? " is-open" : ""}`}
    >
      <button
        type="button"
        className="dash-notify-trigger"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <BellIcon className="dash-notify-icon" />
        {badgeLabel ? (
          <span className="dash-notify-badge" aria-hidden="true">
            {badgeLabel}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id={panelId}
          className="dash-notify-panel"
          role="dialog"
          aria-label="Customer reply notifications"
        >
          <div className="dash-notify-panel-head">
            <div className="min-w-0">
              <p className="dash-notify-panel-title">Customer Replies</p>
              <p className="dash-notify-panel-meta">
                {!configured
                  ? "Gmail not connected"
                  : hasUnread
                    ? `${count} unread`
                    : "You're caught up"}
              </p>
            </div>
            <button
              type="button"
              className="dash-notify-refresh"
              disabled={loading}
              onClick={() => void refresh()}
            >
              {loading ? "…" : "Refresh"}
            </button>
          </div>

          <div className="dash-notify-panel-body">
            {!configured ? (
              <div className="dash-notify-empty">
                <p className="dash-notify-empty-title">Gmail not connected</p>
                <p className="dash-notify-empty-copy">
                  Connect the workspace mailbox in Settings to receive reply
                  alerts here.
                </p>
              </div>
            ) : loading && items.length === 0 && !error ? (
              <p className="dash-notify-status" role="status">
                Checking for replies…
              </p>
            ) : error ? (
              <div className="dash-notify-error" role="alert">
                <p className="dash-notify-error-copy">{error}</p>
                <button
                  type="button"
                  className="dash-notify-refresh"
                  onClick={() => void refresh()}
                >
                  Retry
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="dash-notify-empty">
                <p className="dash-notify-empty-title">You&apos;re caught up</p>
                <p className="dash-notify-empty-copy">
                  No unread customer replies.
                </p>
              </div>
            ) : (
              <ul className="dash-notify-list">
                {items.map((item) => (
                  <li key={`${item.gmailThreadId}-${item.jobId}`}>
                    <Link
                      href={`/admin/jobs?jobId=${item.jobId}&section=communication`}
                      className="dash-notify-row"
                      onClick={() => setOpen(false)}
                    >
                      <div className="dash-notify-row-main">
                        <div className="dash-notify-row-identity">
                          <span className="dash-notify-dot" aria-hidden="true" />
                          <p className="dash-notify-name truncate">
                            {item.customerName}
                          </p>
                          <span className="sr-only">Unread</span>
                        </div>
                        <p className="dash-notify-subject truncate">
                          {item.subject}
                        </p>
                        {item.preview ? (
                          <p className="dash-notify-preview">{item.preview}</p>
                        ) : null}
                      </div>
                      <time
                        className="dash-notify-time"
                        dateTime={item.receivedAt || undefined}
                      >
                        {item.receivedAt
                          ? formatDateTimeNy(item.receivedAt)
                          : "—"}
                      </time>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
