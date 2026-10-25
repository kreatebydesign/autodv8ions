"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDateTimeNy } from "@/lib/utils/format";

type Reminder = {
  id: string;
  job_id: string;
  due_at: string;
  status: string;
  note: string | null;
};

type JobFollowUpSectionProps = {
  jobId: string;
  disabled?: boolean;
};

export default function JobFollowUpSection({
  jobId,
  disabled = false,
}: JobFollowUpSectionProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/follow-up`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setReminders(Array.isArray(data.reminders) ? data.reminders : []);
      }
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}/follow-up`, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (active && res.ok) {
          setReminders(Array.isArray(data.reminders) ? data.reminders : []);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [jobId]);

  const pending = reminders.find((r) => r.status === "pending");

  async function postAction(body: Record<string, unknown>) {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/follow-up`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback(data.error || "Could not update follow-up.");
        return;
      }
      setCustomDate("");
      await load();
      setFeedback(
        body.action === "create"
          ? "Follow-up scheduled."
          : body.action === "complete"
            ? "Follow-up marked complete."
            : body.action === "cancel"
              ? "Follow-up cancelled."
              : "Follow-up updated.",
      );
    } catch {
      setFeedback("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="jobs-panel">
      <h3 className="jobs-section-title">Follow Up</h3>
      <p className="jobs-section-lede">
        Reminder for you only — no email is sent to the customer.
      </p>

      {loading ? (
        <p className="jobs-section-empty">Loading…</p>
      ) : pending ? (
        <div className="jobs-followup-active">
          <p className="jobs-followup-due">
            Due {formatDateTimeNy(pending.due_at)}
            {new Date(pending.due_at) < new Date() ? (
              <span className="jobs-followup-overdue"> · Overdue</span>
            ) : null}
          </p>
          <div className="jobs-actions">
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              disabled={disabled || busy}
              onClick={() =>
                void postAction({ action: "complete", reminderId: pending.id })
              }
            >
              Mark complete
            </button>
            <button
              type="button"
              className="admin-btn"
              disabled={disabled || busy}
              onClick={() =>
                void postAction({ action: "cancel", reminderId: pending.id })
              }
            >
              Cancel
            </button>
          </div>
          <div className="jobs-followup-reschedule">
            <label className="admin-label" htmlFor={`followup-custom-${jobId}`}>
              Reschedule
            </label>
            <input
              id={`followup-custom-${jobId}`}
              type="datetime-local"
              className="admin-input"
              value={customDate}
              disabled={disabled || busy}
              onChange={(e) => setCustomDate(e.target.value)}
            />
            <button
              type="button"
              className="admin-btn"
              disabled={disabled || busy || !customDate.trim()}
              onClick={() =>
                void postAction({
                  action: "reschedule",
                  reminderId: pending.id,
                  dueAt: customDate,
                })
              }
            >
              Save new date
            </button>
          </div>
        </div>
      ) : (
        <div className="jobs-followup-presets">
          <div className="jobs-actions">
            <button
              type="button"
              className="admin-btn"
              disabled={disabled || busy}
              onClick={() => void postAction({ action: "create", preset: "tomorrow" })}
            >
              Tomorrow
            </button>
            <button
              type="button"
              className="admin-btn"
              disabled={disabled || busy}
              onClick={() => void postAction({ action: "create", preset: "3days" })}
            >
              3 Days
            </button>
            <button
              type="button"
              className="admin-btn"
              disabled={disabled || busy}
              onClick={() => void postAction({ action: "create", preset: "1week" })}
            >
              1 Week
            </button>
          </div>
          <div className="jobs-followup-reschedule">
            <label className="admin-label" htmlFor={`followup-new-${jobId}`}>
              Custom date
            </label>
            <input
              id={`followup-new-${jobId}`}
              type="datetime-local"
              className="admin-input"
              value={customDate}
              disabled={disabled || busy}
              onChange={(e) => setCustomDate(e.target.value)}
            />
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              disabled={disabled || busy || !customDate.trim()}
              onClick={() =>
                void postAction({ action: "create", dueAt: customDate })
              }
            >
              Set reminder
            </button>
          </div>
        </div>
      )}

      {feedback ? (
        <p className="jobs-section-empty mt-2" role="status">{feedback}</p>
      ) : null}
    </section>
  );
}
