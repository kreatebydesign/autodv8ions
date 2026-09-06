"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import JobCommunication from "@/components/admin/JobCommunication";
import JobStatusBadge from "@/components/admin/JobStatusBadge";
import { JOB_STATUSES, SERVICE_TYPES } from "@/lib/constants/jobs";
import type { Job } from "@/lib/types/database";
import { buildCalendarDetails, formatCustomerName, formatDate, formatDateTimeNy, formatVehicleShort } from "@/lib/utils/format";

type Feedback = {
  type: "success" | "error";
  text: string;
};

/** Default picker value: tomorrow 10:00 local (treated as America/New_York wall time on create). */
function defaultAppointmentLocalValue() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

/** Prefill datetime-local from an ISO timestamp in America/New_York. */
function toNyDatetimeLocal(value?: string | null) {
  if (!value) return defaultAppointmentLocalValue();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return defaultAppointmentLocalValue();

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "";

  const year = get("year");
  const month = get("month");
  const day = get("day");
  let hour = get("hour");
  const minute = get("minute");
  if (hour === "24") hour = "00";

  if (!year || !month || !day || !hour || !minute) {
    return defaultAppointmentLocalValue();
  }

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

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
  const [appointmentLocal, setAppointmentLocal] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [draftAppointmentNotes, setDraftAppointmentNotes] = useState("");
  const [savingAppointmentNotes, setSavingAppointmentNotes] = useState(false);

  const selected = jobs.find((job) => job.id === selectedId) || null;
  const notesDirty =
    selected !== null && draftNotes !== (selected.internal_notes || "");
  const appointmentNotesDirty =
    selected !== null &&
    draftAppointmentNotes !== (selected.appointment_notes || "");

  useEffect(() => {
    const fromUrl = searchParams.get("jobId");
    setSelectedId(fromUrl);
  }, [searchParams]);

  useEffect(() => {
    if (!selectedId) return;
    if (searchParams.get("section") !== "communication") return;
    const timer = window.setTimeout(() => {
      document
        .getElementById("job-comm-heading")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [selectedId, searchParams]);

  useEffect(() => {
    if (selected) {
      setDraftNotes(selected.internal_notes || "");
      setDraftAppointmentNotes(selected.appointment_notes || "");
    } else {
      setDraftNotes("");
      setDraftAppointmentNotes("");
    }
  }, [selectedId, selected?.internal_notes, selected?.appointment_notes]);

  function resetDetailChrome() {
    setAppointmentLocal(defaultAppointmentLocalValue());
    setScheduling(false);
    setRescheduling(false);
    setCancelling(false);
    setShowReschedule(false);
    setShowCancelConfirm(false);
    setSavingAppointmentNotes(false);
  }

  function buildJobsHref(jobId?: string | null) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (serviceType) params.set("serviceType", serviceType);
    if (jobId) params.set("jobId", jobId);
    const qs = params.toString();
    return qs ? `/admin/jobs?${qs}` : "/admin/jobs";
  }

  function selectJob(id: string) {
    if (id !== selectedId) {
      resetDetailChrome();
    }
    setSelectedId(id);
    router.push(buildJobsHref(id));
  }

  function backToJobs() {
    resetDetailChrome();
    setSelectedId(null);
    setFeedback(null);
    router.push(buildJobsHref(null));
  }

  useEffect(() => {
    if (selected && !selected.google_calendar_event_id) {
      setAppointmentLocal((current) => current || defaultAppointmentLocalValue());
      setShowReschedule(false);
      setShowCancelConfirm(false);
    }
  }, [selectedId, selected?.google_calendar_event_id, selected]);

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

  async function createCalendarEvent(id: string) {
    if (!appointmentLocal.trim()) {
      setFeedback({
        type: "error",
        text: "Choose an appointment date and time first.",
      });
      return;
    }

    setScheduling(true);
    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-calendar-event",
          startDateTime: appointmentLocal,
          appointmentNotes: draftAppointmentNotes.trim() || null,
        }),
      });

      let data: { job?: Job; event?: unknown; error?: string } = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        if (data.job) {
          setJobs((prev) => prev.map((job) => (job.id === id ? data.job! : job)));
        }
        setFeedback({
          type: "error",
          text:
            data.error ||
            "Calendar event failed. Appointment notes may still be saved on this job.",
        });
        return;
      }

      if (!data.job?.google_calendar_event_id) {
        if (data.job) {
          setJobs((prev) => prev.map((job) => (job.id === id ? data.job! : job)));
        }
        setFeedback({
          type: "error",
          text:
            "Scheduling did not return a Google Calendar event link. Refresh and try again.",
        });
        return;
      }

      setJobs((prev) => prev.map((job) => (job.id === id ? data.job! : job)));
      setShowReschedule(false);
      setShowCancelConfirm(false);
      setFeedback({
        type: "success",
        text: "Appointment scheduled on Google Calendar.",
      });
    } catch {
      setFeedback({
        type: "error",
        text: "Calendar request failed. Check your connection and try again.",
      });
    } finally {
      setLoading(false);
      setScheduling(false);
    }
  }

  async function updateCalendarEvent(id: string) {
    if (!appointmentLocal.trim()) {
      setFeedback({
        type: "error",
        text: "Choose a new appointment date and time first.",
      });
      return;
    }

    setRescheduling(true);
    setLoading(true);
    setFeedback(null);

    const res = await fetch(`/api/jobs/${id}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update-calendar-event",
        startDateTime: appointmentLocal,
        appointmentNotes: draftAppointmentNotes.trim() || null,
      }),
    });
    const data = await res.json();

    setLoading(false);
    setRescheduling(false);

    if (!res.ok) {
      if (data.job) {
        setJobs((prev) => prev.map((job) => (job.id === id ? data.job : job)));
      }
      setFeedback({
        type: "error",
        text: data.error || "Could not reschedule appointment.",
      });
      return;
    }

    setJobs((prev) => prev.map((job) => (job.id === id ? data.job : job)));
    setShowReschedule(false);
    setShowCancelConfirm(false);
    setFeedback({ type: "success", text: "Appointment rescheduled." });
  }

  async function cancelCalendarEvent(id: string) {
    setCancelling(true);
    setLoading(true);
    setFeedback(null);

    const res = await fetch(`/api/jobs/${id}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "cancel-calendar-event",
      }),
    });
    const data = await res.json();

    setLoading(false);
    setCancelling(false);

    if (!res.ok) {
      if (data.job) {
        setJobs((prev) => prev.map((job) => (job.id === id ? data.job : job)));
      }
      setFeedback({
        type: "error",
        text: data.error || "Could not cancel appointment.",
      });
      return;
    }

    setJobs((prev) => prev.map((job) => (job.id === id ? data.job : job)));
    setShowReschedule(false);
    setShowCancelConfirm(false);
    setAppointmentLocal(defaultAppointmentLocalValue());
    setFeedback({
      type: "success",
      text: data.alreadyMissing
        ? "Google event was already gone. Appointment cleared on this job."
        : "Appointment cancelled and removed from Google Calendar.",
    });
  }

  async function copyCalendarDetails(job: Job) {
    await navigator.clipboard.writeText(buildCalendarDetails(job));
    setFeedback({ type: "success", text: "Calendar details copied." });
  }

  function openReschedule(job: Job) {
    setShowCancelConfirm(false);
    setAppointmentLocal(toNyDatetimeLocal(job.scheduled_at));
    setShowReschedule(true);
  }

  async function saveAppointmentNotes() {
    if (!selected || !appointmentNotesDirty) return;

    setSavingAppointmentNotes(true);
    setFeedback(null);

    const notesValue = draftAppointmentNotes.trim() || null;
    const ok = await updateJob(selected.id, { appointmentNotes: notesValue });

    if (!ok) {
      setSavingAppointmentNotes(false);
      return;
    }

    // If a Calendar event is linked, refresh its description without changing time.
    if (selected.google_calendar_event_id && selected.scheduled_at) {
      const startDateTime =
        appointmentLocal.trim() || toNyDatetimeLocal(selected.scheduled_at);
      const res = await fetch(`/api/jobs/${selected.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-calendar-event",
          startDateTime,
          appointmentNotes: notesValue,
        }),
      });
      const data = await res.json();
      if (res.ok && data.job) {
        setJobs((prev) =>
          prev.map((job) => (job.id === selected.id ? data.job : job)),
        );
        setFeedback({
          type: "success",
          text: "Appointment notes saved and synced to Google Calendar.",
        });
      } else {
        setFeedback({
          type: "error",
          text:
            data.error ||
            "Notes saved on the job, but Google Calendar could not be updated.",
        });
      }
      setSavingAppointmentNotes(false);
      return;
    }

    setSavingAppointmentNotes(false);
    setFeedback({ type: "success", text: "Appointment notes saved." });
  }

  const detailDisabled =
    loading ||
    savingStatus ||
    savingNotes ||
    scheduling ||
    rescheduling ||
    cancelling ||
    savingAppointmentNotes;
  const hasAppointment = Boolean(selected?.google_calendar_event_id);
  const detailMode = Boolean(selectedId);

  if (detailMode) {
    if (!selected) {
      return (
        <div className="space-y-6">
          <button type="button" className="job-back" onClick={backToJobs}>
            ← Back to Jobs
          </button>
          <div className="job-section">
            <p className="job-value">Job not found</p>
            <p className="job-meta mt-2">
              This job may have been filtered out or is no longer available.
            </p>
          </div>
        </div>
      );
    }

    const vehicleExtra = [selected.vehicles?.color, selected.vehicles?.vehicle_type]
      .filter(Boolean)
      .join(" · ");

    return (
      <div key={selected.id} className="job-profile">
        <header className="job-header">
          <div className="job-header-top">
            <button type="button" className="job-back" onClick={backToJobs}>
              ← Back to Jobs
            </button>
            <button
              type="button"
              className="admin-btn"
              onClick={() => router.push(`/admin/invoices/new?jobId=${selected.id}`)}
            >
              New Invoice
            </button>
          </div>

          <div className="job-header-main">
            <div className="min-w-0">
              <p className="job-header-kicker">Job Profile</p>
              <h1 className="job-header-name">
                {formatCustomerName(selected.customers)}
              </h1>
              <p className="job-header-sub">
                {formatVehicleShort(selected.vehicles)}
                {" · "}
                {selected.service_type}
                {selected.tint_percentage ? ` · ${selected.tint_percentage}` : ""}
              </p>
              <p className="job-header-meta">
                Created {formatDate(selected.created_at)}
              </p>
            </div>

            <div className="job-status-panel">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="admin-label mb-0">Status</p>
                {savingStatus ? (
                  <span className="text-xs text-[var(--dv8-muted)]">Saving…</span>
                ) : (
                  <JobStatusBadge status={selected.status} />
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
            </div>
          </div>
        </header>

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

        <div className="job-grid-2">
          <section className="job-section job-section--info">
            <h2 className="job-section-title">Customer</h2>
            <div className="job-field-grid">
              <div className="job-field job-field--wide">
                <p className="admin-label">Name</p>
                <p className="job-value">{formatCustomerName(selected.customers)}</p>
              </div>
              <div className="job-field">
                <p className="admin-label">Phone</p>
                {selected.customers?.phone ? (
                  <a
                    className="job-value job-field-link"
                    href={`tel:${selected.customers.phone}`}
                  >
                    {selected.customers.phone}
                  </a>
                ) : (
                  <p className="job-meta">—</p>
                )}
              </div>
              <div className="job-field">
                <p className="admin-label">Email</p>
                {selected.customers?.email ? (
                  <p className="job-value break-all">{selected.customers.email}</p>
                ) : (
                  <p className="job-meta">—</p>
                )}
              </div>
            </div>
            <div className="job-actions">
              {selected.customers?.phone && (
                <a className="admin-btn" href={`tel:${selected.customers.phone}`}>
                  Call
                </a>
              )}
            </div>
          </section>

          <section className="job-section job-section--info">
            <h2 className="job-section-title">Vehicle &amp; Service</h2>
            <div className="job-field-grid">
              <div className="job-field job-field--wide">
                <p className="admin-label">Vehicle</p>
                <p className="job-value">{formatVehicleShort(selected.vehicles)}</p>
                {vehicleExtra ? <p className="job-meta mt-1">{vehicleExtra}</p> : null}
              </div>
              <div className="job-field">
                <p className="admin-label">Service</p>
                <p className="job-value">{selected.service_type}</p>
              </div>
              <div className="job-field">
                <p className="admin-label">Tint</p>
                <p className="job-value">{selected.tint_percentage || "—"}</p>
              </div>
            </div>
          </section>
        </div>

        <section className="job-section job-section--ops">
          <div className="job-section-head">
            <div>
              <h2 className="job-section-title">Appointment</h2>
              <p className="job-section-lede">
                America/New_York · 2-hour default duration
              </p>
            </div>
            {hasAppointment && <span className="job-pill">Scheduled</span>}
          </div>

          <div className="job-appt-frame">
            <label className="admin-label" htmlFor="appointment-notes">
              Appointment Notes (optional)
            </label>
            <textarea
              id="appointment-notes"
              className="admin-input min-h-[4.5rem]"
              value={draftAppointmentNotes}
              disabled={detailDisabled}
              onChange={(e) => setDraftAppointmentNotes(e.target.value)}
              placeholder="Drop off at 8:00 · Needs vehicle back by 3:00 · Call when finished"
            />
            <p className="mt-2 text-xs text-[var(--dv8-muted)]">
              Syncs to the Google Calendar event description. Internal Notes stay
              private.
            </p>
            {appointmentNotesDirty && (
              <div className="mt-3">
                <button
                  type="button"
                  className="admin-btn"
                  disabled={detailDisabled}
                  onClick={saveAppointmentNotes}
                >
                  {savingAppointmentNotes ? "Saving…" : "Save Appointment Notes"}
                </button>
              </div>
            )}
          </div>

          {hasAppointment ? (
            <div className="space-y-4">
              <div className="job-appt-frame">
                <p className="admin-label mb-2">Scheduled for</p>
                <p className="job-appt-time">
                  {formatDateTimeNy(selected.scheduled_at)}
                </p>
                {!selected.scheduled_at && (
                  <p className="job-meta mt-2">
                    Linked to Google Calendar. Time not stored on this job.
                  </p>
                )}
              </div>

              {showReschedule ? (
                <div className="space-y-3 border-t border-[var(--dv8-border)] pt-4">
                  <div className="job-appt-frame">
                    <label className="admin-label" htmlFor="reschedule-datetime">
                      New date &amp; time
                    </label>
                    <input
                      id="reschedule-datetime"
                      className="admin-input"
                      type="datetime-local"
                      value={appointmentLocal}
                      disabled={detailDisabled}
                      onChange={(e) => setAppointmentLocal(e.target.value)}
                    />
                    <p className="mt-2 text-xs text-[var(--dv8-muted)]">
                      Updates the existing Google event. Duration is kept when available.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="admin-btn admin-btn-primary"
                      disabled={detailDisabled || !appointmentLocal.trim()}
                      onClick={() => updateCalendarEvent(selected.id)}
                    >
                      {rescheduling ? "Saving…" : "Save New Time"}
                    </button>
                    <button
                      type="button"
                      className="admin-btn"
                      disabled={detailDisabled}
                      onClick={() => setShowReschedule(false)}
                    >
                      Back
                    </button>
                  </div>
                </div>
              ) : showCancelConfirm ? (
                <div className="space-y-3 border-t border-[var(--dv8-border)] pt-4">
                  <p className="job-meta">
                    Cancel this appointment? It will be removed from Google Calendar.
                    Job status will stay unchanged.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="admin-btn admin-btn-primary"
                      disabled={detailDisabled}
                      onClick={() => cancelCalendarEvent(selected.id)}
                    >
                      {cancelling ? "Cancelling…" : "Confirm Cancel"}
                    </button>
                    <button
                      type="button"
                      className="admin-btn"
                      disabled={detailDisabled}
                      onClick={() => setShowCancelConfirm(false)}
                    >
                      Keep Appointment
                    </button>
                  </div>
                </div>
              ) : (
                <div className="job-actions job-actions--flush">
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary"
                    disabled={detailDisabled}
                    onClick={() => openReschedule(selected)}
                  >
                    Reschedule
                  </button>
                  <button
                    type="button"
                    className="admin-btn"
                    disabled={detailDisabled}
                    onClick={() => {
                      setShowReschedule(false);
                      setShowCancelConfirm(true);
                    }}
                  >
                    Cancel Appointment
                  </button>
                  <button
                    type="button"
                    className="admin-btn"
                    disabled={detailDisabled}
                    onClick={() => copyCalendarDetails(selected)}
                  >
                    Copy Details
                  </button>
                  {selected.google_calendar_event_url && (
                    <a
                      href={selected.google_calendar_event_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-btn"
                    >
                      Open in Google Calendar
                    </a>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="job-appt-frame">
                <label className="admin-label" htmlFor="appointment-datetime">
                  Date &amp; time
                </label>
                <input
                  id="appointment-datetime"
                  className="admin-input"
                  type="datetime-local"
                  value={appointmentLocal}
                  disabled={detailDisabled}
                  onChange={(e) => setAppointmentLocal(e.target.value)}
                />
                <p className="mt-2 text-xs text-[var(--dv8-muted)]">
                  Required before creating a calendar event. Duration is 2 hours.
                </p>
              </div>
              <div className="job-actions job-actions--flush">
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  disabled={detailDisabled || !appointmentLocal.trim()}
                  onClick={() => createCalendarEvent(selected.id)}
                >
                  {scheduling ? "Scheduling…" : "Schedule Appointment"}
                </button>
                <button
                  type="button"
                  className="admin-btn"
                  disabled={detailDisabled}
                  onClick={() => copyCalendarDetails(selected)}
                >
                  Copy Details
                </button>
              </div>
            </div>
          )}
        </section>

        <JobCommunication
          jobId={selected.id}
          customerEmail={selected.customers?.email}
          disabled={detailDisabled}
        />

        <div className="job-grid-2">
          <section className="job-section job-section--notes">
            <h2 className="job-section-title">Customer Notes</h2>
            <p className="job-notes-body">
              {selected.customer_notes || "No customer notes on this job."}
            </p>
          </section>

          <section className="job-section job-section--notes">
            <h2 className="job-section-title">Internal Notes</h2>
            <textarea
              className="admin-input"
              value={draftNotes}
              disabled={detailDisabled}
              onChange={(e) => setDraftNotes(e.target.value)}
              placeholder="Shop notes visible only to the team…"
            />
            <div className="job-actions">
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                disabled={detailDisabled || !notesDirty}
                onClick={handleSaveNotes}
              >
                {savingNotes ? "Saving…" : "Save Notes"}
              </button>
              {notesDirty && !savingNotes && (
                <span className="text-xs text-[var(--dv8-muted)]">Unsaved changes</span>
              )}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--dv8-muted)]">
          Operations
        </p>
        <h1 className="mt-2 text-3xl font-light tracking-tight">Jobs</h1>
      </div>

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
        <button
          type="button"
          className="admin-btn admin-btn-primary md:col-span-4"
          onClick={refreshJobs}
        >
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
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={4} className="job-meta">
                  No jobs match these filters.
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr
                  key={job.id}
                  className="cursor-pointer transition-colors hover:bg-white/[0.04]"
                  onClick={() => selectJob(job.id)}
                >
                  <td className="text-[var(--dv8-white)]">
                    {formatCustomerName(job.customers)}
                  </td>
                  <td className="text-[var(--dv8-text-secondary)]">
                    {formatVehicleShort(job.vehicles)}
                  </td>
                  <td className="text-[var(--dv8-text-secondary)]">{job.service_type}</td>
                  <td>
                    <JobStatusBadge status={job.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
