"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import JobStatusBadge from "@/components/admin/JobStatusBadge";
import { JOB_STATUSES, SERVICE_TYPES } from "@/lib/constants/jobs";
import type { Job } from "@/lib/types/database";
import { buildCalendarDetails, formatCustomerName, formatVehicleShort } from "@/lib/utils/format";

type Feedback = {
  type: "success" | "error";
  text: string;
};

export default function JobsClient({ initialJobs }: { initialJobs: Job[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState(initialJobs);
  const [selectedId, setSelectedId] = useState<string | null>(
    () => searchParams.get("jobId"),
  );
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [serviceType, setServiceType] = useState(searchParams.get("serviceType") || "");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [draftNotes, setDraftNotes] = useState("");
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  const selected = jobs.find((job) => job.id === selectedId) || null;
  const notesDirty =
    selected !== null && draftNotes !== (selected.internal_notes || "");

  useEffect(() => {
    if (selected) {
      setDraftNotes(selected.internal_notes || "");
    } else {
      setDraftNotes("");
    }
  }, [selectedId, selected?.internal_notes]);

  function selectJob(id: string) {
    if (id !== selectedId) {
      setShowEmailComposer(false);
      setEmailSubject("");
      setEmailMessage("");
      setSendingEmail(false);
    }
    setSelectedId(id);
  }

  async function refreshJobs() {
    setFeedback(null);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (serviceType) params.set("serviceType", serviceType);

    const res = await fetch(`/api/jobs?${params.toString()}`, {
      credentials: "include",
    });
    const data = await res.json();

    if (!res.ok) {
      setFeedback({ type: "error", text: data.error || "Failed to load jobs." });
      return;
    }

    setJobs(data.jobs || []);
    setFeedback({ type: "success", text: "Jobs refreshed." });
  }

  async function updateJob(
    id: string,
    payload: Record<string, unknown>,
    options?: { optimistic?: Partial<Job>; rollback?: Job },
  ) {
    const res = await fetch(`/api/jobs/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    let data: { job?: Job; error?: string } = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    if (!res.ok) {
      if (options?.rollback) {
        setJobs((prev) => prev.map((job) => (job.id === id ? options.rollback! : job)));
      }
      setFeedback({
        type: "error",
        text: data.error || "Update failed. Check your connection and try again.",
      });
      return false;
    }

    if (data.job) {
      setJobs((prev) => prev.map((job) => (job.id === id ? data.job! : job)));
    }

    return true;
  }

  async function handleStatusChange(nextStatus: string) {
    if (!selected || nextStatus === selected.status) return;

    const previousJob = selected;
    setSavingStatus(true);
    setFeedback(null);

    setJobs((prev) =>
      prev.map((job) =>
        job.id === selected.id ? { ...job, status: nextStatus } : job,
      ),
    );

    const ok = await updateJob(
      selected.id,
      { status: nextStatus },
      { rollback: previousJob },
    );

    setSavingStatus(false);

    if (ok) {
      setFeedback({ type: "success", text: `Status saved as "${nextStatus}".` });
    }
  }

  async function handleSaveNotes() {
    if (!selected) return;

    setSavingNotes(true);
    setFeedback(null);

    const ok = await updateJob(selected.id, { internalNotes: draftNotes });

    setSavingNotes(false);

    if (ok) {
      setFeedback({ type: "success", text: "Internal notes saved." });
    }
  }

  async function handleSendCustomerEmail() {
    if (!selected || sendingEmail) return;

    const to = selected.customers?.email?.trim() || "";
    const subject = emailSubject.trim();
    const message = emailMessage.trim();

    if (!to) {
      setFeedback({ type: "error", text: "This customer has no email address." });
      return;
    }
    if (!subject) {
      setFeedback({ type: "error", text: "Subject is required." });
      return;
    }
    if (!message) {
      setFeedback({ type: "error", text: "Message is required." });
      return;
    }

    setSendingEmail(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/jobs/${selected.id}/email`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, message }),
      });

      let data: { error?: string; success?: boolean } = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        setFeedback({
          type: "error",
          text: data.error || "Email failed to send.",
        });
        return;
      }

      setFeedback({
        type: "success",
        text: `Email sent to ${to}.`,
      });
      setEmailSubject("");
      setEmailMessage("");
      setShowEmailComposer(false);
    } catch {
      setFeedback({
        type: "error",
        text: "Email failed to send. Check your connection and try again.",
      });
    } finally {
      setSendingEmail(false);
    }
  }

  async function createCalendarEvent(id: string) {
    setLoading(true);
    setFeedback(null);

    const res = await fetch(`/api/jobs/${id}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create-calendar-event" }),
    });
    const data = await res.json();

    setLoading(false);

    if (!res.ok) {
      setFeedback({ type: "error", text: data.error || "Calendar event failed." });
      return;
    }

    setJobs((prev) => prev.map((job) => (job.id === id ? data.job : job)));
    setFeedback({ type: "success", text: "Google Calendar event created." });
  }

  async function copyCalendarDetails(job: Job) {
    await navigator.clipboard.writeText(buildCalendarDetails(job));
    setFeedback({ type: "success", text: "Calendar details copied." });
  }

  const detailDisabled = loading || savingStatus || savingNotes || sendingEmail;

  return (
    <div className="space-y-6">
      <div className="admin-panel grid gap-4 p-4 md:grid-cols-4">
        <input
          className="admin-input md:col-span-2"
          placeholder="Search jobs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="admin-input"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          {JOB_STATUSES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          className="admin-input"
          value={serviceType}
          onChange={(e) => setServiceType(e.target.value)}
        >
          <option value="">All Services</option>
          {SERVICE_TYPES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <button type="button" className="admin-btn admin-btn-primary md:col-span-4" onClick={refreshJobs}>
          Apply Filters
        </button>
      </div>

      {feedback && (
        <div
          className={`admin-panel px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-[rgba(34,197,94,0.35)] text-green-300"
              : "border-[rgba(239,68,68,0.35)] text-red-300"
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="admin-panel overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Vehicle</th>
                <th>Service</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr
                  key={job.id}
                  className={`cursor-pointer hover:bg-white/[0.03] ${selectedId === job.id ? "bg-[var(--dv8-red-soft)]" : ""}`}
                  onClick={() => selectJob(job.id)}
                >
                  <td>{formatCustomerName(job.customers)}</td>
                  <td>{formatVehicleShort(job.vehicles)}</td>
                  <td>{job.service_type}</td>
                  <td>
                    <JobStatusBadge status={job.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-panel p-5">
          {!selected ? (
            <p className="text-sm text-[var(--dv8-muted)]">Select a job to view details.</p>
          ) : (
            <div key={selected.id} className="space-y-4">
              <div>
                <p className="admin-label">Customer</p>
                <p>{formatCustomerName(selected.customers)}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-sm">
                  {selected.customers?.phone && (
                    <a
                      className="text-[var(--dv8-red-bright)]"
                      href={`tel:${selected.customers.phone}`}
                    >
                      Call
                    </a>
                  )}
                  {selected.customers?.email && (
                    <button
                      type="button"
                      className="text-[var(--dv8-red-bright)] underline-offset-2 hover:underline"
                      disabled={detailDisabled}
                      onClick={() => setShowEmailComposer((open) => !open)}
                    >
                      {showEmailComposer ? "Hide Email" : "Email Customer"}
                    </button>
                  )}
                </div>
              </div>

              {showEmailComposer && selected.customers?.email && (
                <div className="space-y-3 rounded-md border border-[var(--dv8-border)] bg-black/20 p-4">
                  <div>
                    <p className="admin-label">To</p>
                    <input
                      className="admin-input"
                      type="email"
                      value={selected.customers.email}
                      readOnly
                      aria-readonly="true"
                    />
                  </div>
                  <div>
                    <p className="admin-label">Subject</p>
                    <input
                      className="admin-input"
                      type="text"
                      value={emailSubject}
                      disabled={sendingEmail}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Subject"
                    />
                  </div>
                  <div>
                    <p className="admin-label">Message</p>
                    <textarea
                      className="admin-input min-h-28"
                      value={emailMessage}
                      disabled={sendingEmail}
                      onChange={(e) => setEmailMessage(e.target.value)}
                      placeholder="Write your message…"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      className="admin-btn admin-btn-primary"
                      disabled={
                        sendingEmail ||
                        !emailSubject.trim() ||
                        !emailMessage.trim()
                      }
                      onClick={handleSendCustomerEmail}
                    >
                      {sendingEmail ? "Sending…" : "Send"}
                    </button>
                    <span className="text-xs text-[var(--dv8-muted)]">
                      Sends from AutoDV8ions Sales · replies go to
                      sales@autodv8ions.com
                    </span>
                  </div>
                </div>
              )}

              <div>
                <p className="admin-label">Vehicle</p>
                <p>{formatVehicleShort(selected.vehicles)}</p>
                <p className="text-sm text-[var(--dv8-muted)]">
                  {[selected.vehicles?.color, selected.vehicles?.vehicle_type].filter(Boolean).join(" · ")}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="admin-label">Service</p>
                  <p>{selected.service_type}</p>
                </div>
                <div>
                  <p className="admin-label">Tint</p>
                  <p>{selected.tint_percentage || "—"}</p>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="admin-label mb-0">Status</p>
                  {savingStatus && (
                    <span className="text-xs text-[var(--dv8-muted)]">Saving...</span>
                  )}
                </div>
                <select
                  className="admin-input"
                  value={selected.status}
                  disabled={detailDisabled}
                  onChange={(e) => handleStatusChange(e.target.value)}
                >
                  {JOB_STATUSES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-[var(--dv8-muted)]">
                  Status saves immediately when changed.
                </p>
              </div>

              <div>
                <p className="admin-label">Customer Notes</p>
                <p className="text-sm text-[var(--dv8-muted)]">{selected.customer_notes || "—"}</p>
              </div>

              <div>
                <p className="admin-label">Internal Notes</p>
                <textarea
                  className="admin-input min-h-24"
                  value={draftNotes}
                  disabled={detailDisabled}
                  onChange={(e) => setDraftNotes(e.target.value)}
                />
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary"
                    disabled={detailDisabled || !notesDirty}
                    onClick={handleSaveNotes}
                  >
                    {savingNotes ? "Saving..." : "Save Notes"}
                  </button>
                  {notesDirty && !savingNotes && (
                    <span className="text-xs text-[var(--dv8-muted)]">Unsaved changes</span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="admin-btn"
                  disabled={detailDisabled}
                  onClick={() => copyCalendarDetails(selected)}
                >
                  Copy Calendar Details
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  disabled={detailDisabled}
                  onClick={() => createCalendarEvent(selected.id)}
                >
                  Create Google Calendar Event
                </button>
                {selected.google_calendar_event_url && (
                  <a
                    href={selected.google_calendar_event_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="admin-btn"
                  >
                    Open Event
                  </a>
                )}
                <button
                  type="button"
                  className="admin-btn"
                  onClick={() => router.push(`/admin/invoices/new?jobId=${selected.id}`)}
                >
                  New Invoice
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
