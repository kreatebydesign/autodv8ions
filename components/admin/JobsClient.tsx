"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import JobCommunication from "@/components/admin/JobCommunication";
import JobStatusBadge from "@/components/admin/JobStatusBadge";
import { JOB_STATUSES, SERVICE_TYPES } from "@/lib/constants/jobs";
import { statusesMatchingFilter } from "@/lib/jobs/status-filter";
import type { Invoice, Job } from "@/lib/types/database";
import {
  buildCalendarDetails,
  formatCurrency,
  formatCustomerName,
  formatDate,
  formatDateTimeNy,
  formatEmailLink,
  formatPhoneDisplay,
  formatPhoneLink,
  formatVehicleShort,
} from "@/lib/utils/format";
import {
  buildGoogleWorkspaceReconnectHref,
  isGmailAuthorizationErrorCode,
} from "@/lib/google/gmail-ui";

type Feedback = {
  type: "success" | "error";
  text: string;
  code?: string | null;
};

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

function normalizeSearch(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function digitsOnly(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function matchesJob(job: Job, query: string) {
  if (!query) return true;
  const customer = job.customers;
  const vehicle = job.vehicles;
  const haystack = [
    formatCustomerName(customer),
    customer?.phone,
    customer?.email,
    digitsOnly(customer?.phone),
    vehicle?.year,
    vehicle?.make,
    vehicle?.model,
    formatVehicleShort(vehicle),
    job.service_type,
  ]
    .map(normalizeSearch)
    .join(" ");
  return haystack.includes(query);
}

function jobSubline(job: Job) {
  const parts = [
    formatVehicleShort(job.vehicles),
    job.service_type,
    job.tint_percentage || null,
  ].filter(Boolean);
  return parts.join(" · ");
}

function PrivateNotesEditor({
  savedNotes,
  disabled,
  saving,
  onSave,
}: {
  savedNotes: string;
  disabled: boolean;
  saving: boolean;
  onSave: (notes: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(savedNotes);
  const dirty = draft !== (savedNotes || "");

  return (
    <>
      <textarea
        className="admin-input mt-2"
        value={draft}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Shop notes visible only to the team…"
      />
      <div className="jobs-actions jobs-actions--tight">
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          disabled={disabled || !dirty}
          onClick={() => onSave(draft)}
        >
          {saving ? "Saving…" : "Save private notes"}
        </button>
        {dirty && !saving ? (
          <span className="text-xs text-[var(--dv8-muted)]">Unsaved changes</span>
        ) : null}
      </div>
    </>
  );
}

function AppointmentNotesField({
  savedNotes,
  disabled,
  saving,
  onDraftChange,
  onSave,
}: {
  savedNotes: string;
  disabled: boolean;
  saving: boolean;
  onDraftChange: (draft: string) => void;
  onSave: (draft: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(savedNotes);
  const dirty = draft !== (savedNotes || "");

  const handleChange = (value: string) => {
    setDraft(value);
    onDraftChange(value);
  };

  return (
    <>
      <textarea
        id="appointment-notes"
        className="admin-input mt-2 min-h-[4.5rem]"
        value={draft}
        disabled={disabled}
        onChange={(event) => handleChange(event.target.value)}
        placeholder="Drop off at 8:00 · Needs vehicle back by 3:00"
      />
      {dirty ? (
        <div className="jobs-actions jobs-actions--tight">
          <button
            type="button"
            className="admin-btn"
            disabled={disabled}
            onClick={() => onSave(draft)}
          >
            {saving ? "Saving…" : "Save appointment notes"}
          </button>
        </div>
      ) : null}
    </>
  );
}

export default function JobsClient({ initialJobs }: { initialJobs: Job[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("jobId");
  const statusFilter = searchParams.get("status") || "";
  const serviceFilter = searchParams.get("serviceType") || "";
  const [jobs, setJobs] = useState(initialJobs);
  const [query, setQuery] = useState("");
  const urlJobId = searchParams.get("jobId");
  const [mobileUi, setMobileUi] = useState(() => ({
    detailHidden: !urlJobId,
    seenUrlJobId: urlJobId,
  }));
  if (urlJobId !== mobileUi.seenUrlJobId) {
    setMobileUi({
      seenUrlJobId: urlJobId,
      detailHidden: urlJobId ? false : mobileUi.detailHidden,
    });
  }
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [appointmentNotesDraft, setAppointmentNotesDraft] = useState("");
  const [appointmentLocal, setAppointmentLocal] = useState(
    defaultAppointmentLocalValue,
  );
  const [scheduling, setScheduling] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingJob, setDeletingJob] = useState(false);
  const [savingAppointmentNotes, setSavingAppointmentNotes] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [fetchingJob, setFetchingJob] = useState(false);

  const normalizedQuery = normalizeSearch(query);
  const matchingStatuses = useMemo(
    () => statusesMatchingFilter(statusFilter || null),
    [statusFilter],
  );

  const visibleJobs = useMemo(
    () =>
      jobs.filter((job) => {
        if (
          matchingStatuses &&
          !matchingStatuses.includes(String(job.status))
        ) {
          return false;
        }
        if (serviceFilter && job.service_type !== serviceFilter) {
          return false;
        }
        return matchesJob(job, normalizedQuery);
      }),
    [jobs, matchingStatuses, serviceFilter, normalizedQuery],
  );

  const selected = useMemo(() => {
    if (selectedId) {
      return (
        jobs.find((job) => job.id === selectedId) ??
        visibleJobs.find((job) => job.id === selectedId) ??
        null
      );
    }
    return visibleJobs[0] ?? null;
  }, [selectedId, jobs, visibleJobs]);

  const jobMissing = Boolean(
    selectedId && !jobs.some((job) => job.id === selectedId),
  );
  const detailLoading = fetchingJob || jobMissing;
  const mobileShowDetail = Boolean(selected) && !mobileUi.detailHidden;

  const handleAppointmentNotesDraft = useCallback((draft: string) => {
    setAppointmentNotesDraft(draft);
  }, []);

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
    if (!selectedId || jobs.some((job) => job.id === selectedId)) {
      return;
    }

    let cancelled = false;
    (async () => {
      setFetchingJob(true);
      try {
        const res = await fetch(`/api/jobs/${selectedId}`, {
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && data.job) {
          setJobs((current) => {
            if (current.some((job) => job.id === data.job.id)) {
              return current.map((job) =>
                job.id === data.job.id ? data.job : job,
              );
            }
            return [data.job, ...current];
          });
        }
      } finally {
        if (!cancelled) setFetchingJob(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedId, jobs]);

  useEffect(() => {
    const jobId = selected?.id;
    if (!jobId) {
      return;
    }

    let cancelled = false;
    (async () => {
      setInvoicesLoading(true);
      try {
        const res = await fetch(
          `/api/invoices?jobId=${encodeURIComponent(jobId)}`,
          { credentials: "include" },
        );
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok) {
          setInvoices((data.invoices as Invoice[]) || []);
        } else {
          setInvoices([]);
        }
      } finally {
        if (!cancelled) setInvoicesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selected?.id]);

  function pushJobsQuery(params: URLSearchParams) {
    const qs = params.toString();
    router.push(qs ? `/admin/jobs?${qs}` : "/admin/jobs");
  }

  function resetDetailChrome() {
    setAppointmentLocal(defaultAppointmentLocalValue());
    setScheduling(false);
    setRescheduling(false);
    setCancelling(false);
    setShowReschedule(false);
    setShowCancelConfirm(false);
    setShowDeleteConfirm(false);
    setDeletingJob(false);
    setSavingAppointmentNotes(false);
  }

  function buildJobsHref(jobId?: string | null) {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (serviceFilter) params.set("serviceType", serviceFilter);
    if (jobId) params.set("jobId", jobId);
    const section = searchParams.get("section");
    if (jobId && section) params.set("section", section);
    const qs = params.toString();
    return qs ? `/admin/jobs?${qs}` : "/admin/jobs";
  }

  function selectJob(id: string) {
    if (id !== selectedId) {
      resetDetailChrome();
      setFeedback(null);
      setInvoices([]);
      setInvoicesLoading(false);
      const job = jobs.find((item) => item.id === id);
      setAppointmentNotesDraft(job?.appointment_notes || "");
    }
    setMobileUi((current) => ({ ...current, detailHidden: false }));
    router.push(buildJobsHref(id));
  }

  async function handleDeleteJob(jobId: string) {
    setDeletingJob(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFeedback({
          type: "error",
          text: data.error || "Job could not be deleted.",
        });
        return;
      }
      setJobs((current) => current.filter((job) => job.id !== jobId));
      resetDetailChrome();
      setInvoices([]);
      setInvoicesLoading(false);
      setMobileUi((current) => ({ ...current, detailHidden: true }));
      setFeedback({
        type: "success",
        text: "Job deleted. Related invoices and appointment notes for that job were removed.",
      });
      router.push(buildJobsHref(null));
    } catch {
      setFeedback({ type: "error", text: "Network error while deleting job." });
    } finally {
      setDeletingJob(false);
    }
  }

  async function updateJob(
    id: string,
    payload: Record<string, unknown>,
    options?: { rollback?: Job },
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
        setJobs((prev) =>
          prev.map((job) => (job.id === id ? options.rollback! : job)),
        );
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

  async function handleSaveNotes(notes: string) {
    if (!selected) return;

    setSavingNotes(true);
    setFeedback(null);

    const ok = await updateJob(selected.id, { internalNotes: notes });

    setSavingNotes(false);

    if (ok) {
      setFeedback({ type: "success", text: "Private notes saved." });
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
          appointmentNotes:
            appointmentNotesDraft.trim() ||
            selected?.appointment_notes?.trim() ||
            null,
        }),
      });

      let data: {
        job?: Job;
        error?: string;
        code?: string;
      } = {};
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
          code: data.code || null,
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
        appointmentNotes:
          appointmentNotesDraft.trim() ||
          selected?.appointment_notes?.trim() ||
          null,
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
        code: data.code || null,
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
        code: data.code || null,
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

  async function saveAppointmentNotes(notesDraft: string) {
    if (!selected) return;
    const notesValue = notesDraft.trim() || null;
    if ((notesDraft.trim() || "") === (selected.appointment_notes || "")) {
      return;
    }

    setSavingAppointmentNotes(true);
    setFeedback(null);
    const ok = await updateJob(selected.id, { appointmentNotes: notesValue });

    if (!ok) {
      setSavingAppointmentNotes(false);
      return;
    }

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
          code: data.code || null,
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
    deletingJob ||
    savingAppointmentNotes;
  const hasAppointment = Boolean(selected?.google_calendar_event_id);
  const needsGoogleReconnect = isGmailAuthorizationErrorCode(feedback?.code);
  const googleReconnectHref = buildGoogleWorkspaceReconnectHref(
    selected?.id ? `/admin/jobs?jobId=${selected.id}` : "/admin/jobs",
  );

  const listActiveId = selected?.id ?? null;

  return (
    <div className="jobs-workspace">
      <div className="jobs-header">
        <div>
          <h1 className="jobs-title">Jobs</h1>
          <p className="jobs-count">
            {jobs.length} record{jobs.length === 1 ? "" : "s"}
            {normalizedQuery || statusFilter || serviceFilter
              ? ` · ${visibleJobs.length} shown`
              : ""}
          </p>
        </div>
        <div className="jobs-filters">
          <div className="jobs-search-wrap">
            <label className="sr-only" htmlFor="job-search">
              Search jobs
            </label>
            <input
              id="job-search"
              type="search"
              className="jobs-search-input"
              placeholder="Search name, phone, email, vehicle, service…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoComplete="off"
            />
            {query ? (
              <button
                type="button"
                className="jobs-search-clear"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                Clear
              </button>
            ) : null}
          </div>
          <label className="sr-only" htmlFor="job-status-filter">
            Filter by status
          </label>
          <select
            id="job-status-filter"
            className="jobs-filter-select"
            value={statusFilter}
            onChange={(event) => {
              const params = new URLSearchParams(searchParams.toString());
              const value = event.target.value;
              if (value) params.set("status", value);
              else params.delete("status");
              pushJobsQuery(params);
            }}
          >
            <option value="">All statuses</option>
            {JOB_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="job-service-filter">
            Filter by service
          </label>
          <select
            id="job-service-filter"
            className="jobs-filter-select"
            value={serviceFilter}
            onChange={(event) => {
              const params = new URLSearchParams(searchParams.toString());
              const value = event.target.value;
              if (value) params.set("serviceType", value);
              else params.delete("serviceType");
              pushJobsQuery(params);
            }}
          >
            <option value="">All services</option>
            {SERVICE_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      {feedback ? (
        <div
          className={`jobs-feedback${
            feedback.type === "success" ? " is-success" : " is-error"
          }`}
          role="status"
        >
          <p className="m-0">{feedback.text}</p>
          {needsGoogleReconnect ? (
            <p className="mt-3 mb-0">
              <a className="admin-btn admin-btn-primary" href={googleReconnectHref}>
                Reconnect Google Workspace
              </a>
            </p>
          ) : null}
        </div>
      ) : null}

      <div
        className={`jobs-shell${
          mobileShowDetail && selected ? " is-detail" : ""
        }`}
      >
        <div className="jobs-list" role="listbox" aria-label="Jobs">
          {jobs.length === 0 ? (
            <p className="jobs-empty">No jobs yet.</p>
          ) : visibleJobs.length === 0 ? (
            <p className="jobs-empty">No jobs match these filters.</p>
          ) : (
            visibleJobs.map((job) => (
              <button
                key={job.id}
                type="button"
                role="option"
                aria-selected={listActiveId === job.id}
                className={`jobs-row${
                  listActiveId === job.id ? " is-active" : ""
                }`}
                onClick={() => selectJob(job.id)}
              >
                <p className="jobs-row-name">
                  {formatCustomerName(job.customers)}
                </p>
                <p className="jobs-row-meta">
                  {formatVehicleShort(job.vehicles)}
                </p>
                <p className="jobs-row-service">{job.service_type}</p>
                <div className="jobs-row-aside">
                  <JobStatusBadge status={job.status} />
                </div>
              </button>
            ))
          )}
        </div>

        <div className="jobs-detail">
          <button
            type="button"
            className="jobs-back"
            onClick={() => {
              setMobileUi((current) => ({ ...current, detailHidden: true }));
              setShowDeleteConfirm(false);
              setShowCancelConfirm(false);
              setShowReschedule(false);
            }}
          >
            ← Jobs
          </button>

          {detailLoading && selectedId && !selected ? (
            <p className="jobs-placeholder">Loading job…</p>
          ) : !selected ? (
            <p className="jobs-placeholder">
              {visibleJobs.length === 0
                ? "No jobs match these filters."
                : "Select a job to view status, appointment, and messages."}
            </p>
          ) : (
            <div key={selected.id} className="jobs-record">
              <header className="jobs-record-head">
                <h2 className="jobs-detail-name">
                  {formatCustomerName(selected.customers)}
                </h2>
                <p className="jobs-detail-subline">{jobSubline(selected)}</p>
                <div className="jobs-detail-contact">
                  {selected.customers?.phone ? (
                    <a
                      className="jobs-contact-link"
                      href={formatPhoneLink(selected.customers.phone) || undefined}
                    >
                      {formatPhoneDisplay(selected.customers.phone)}
                    </a>
                  ) : (
                    <span className="jobs-contact-muted">No phone</span>
                  )}
                  {selected.customers?.email ? (
                    <a
                      className="jobs-contact-link"
                      href={
                        formatEmailLink(selected.customers.email) || undefined
                      }
                    >
                      {selected.customers.email}
                    </a>
                  ) : (
                    <span className="jobs-contact-muted">No email</span>
                  )}
                </div>
                <p className="jobs-view-client">
                  <Link href="/admin/customers">View client</Link>
                </p>
              </header>

              <div className="jobs-record-body">
                <section className="jobs-panel">
                  <h3 className="jobs-section-title">Status</h3>
                  <div className="jobs-status-row">
                    {savingStatus ? (
                      <span className="text-xs text-[var(--dv8-muted)]">
                        Saving…
                      </span>
                    ) : (
                      <JobStatusBadge status={selected.status} />
                    )}
                  </div>
                  <select
                    className="jobs-status-select"
                    value={selected.status}
                    disabled={detailDisabled}
                    onChange={(event) => handleStatusChange(event.target.value)}
                  >
                    {JOB_STATUSES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </section>

                <section className="jobs-panel">
                  <div className="jobs-panel-head">
                    <div>
                      <h3 className="jobs-section-title">Appointment</h3>
                      <p className="jobs-section-lede">
                        America/New_York · 2-hour default duration
                      </p>
                    </div>
                    {hasAppointment ? (
                      <span className="jobs-pill">Scheduled</span>
                    ) : null}
                  </div>

                  <label className="admin-label" htmlFor="appointment-notes">
                    Appointment notes (optional)
                  </label>
                  <AppointmentNotesField
                    key={selected.id}
                    savedNotes={selected.appointment_notes || ""}
                    disabled={detailDisabled}
                    saving={savingAppointmentNotes}
                    onDraftChange={handleAppointmentNotesDraft}
                    onSave={saveAppointmentNotes}
                  />
                  <p className="mt-2 text-xs text-[var(--dv8-muted)]">
                    Syncs to Google Calendar. Private notes stay on the job only.
                  </p>

                  {hasAppointment ? (
                    <div className="jobs-divider">
                      <p className="admin-label mb-2">Scheduled for</p>
                      <p className="jobs-appt-time">
                        {formatDateTimeNy(selected.scheduled_at)}
                      </p>
                      {!selected.scheduled_at ? (
                        <p className="jobs-section-empty mt-2">
                          Linked to Google Calendar. Time not stored on this job.
                        </p>
                      ) : null}

                      {showReschedule ? (
                        <div className="mt-4 space-y-3">
                          <label
                            className="admin-label"
                            htmlFor="reschedule-datetime"
                          >
                            New date &amp; time
                          </label>
                          <input
                            id="reschedule-datetime"
                            className="admin-input"
                            type="datetime-local"
                            value={appointmentLocal}
                            disabled={detailDisabled}
                            onChange={(event) =>
                              setAppointmentLocal(event.target.value)
                            }
                          />
                          <div className="jobs-actions">
                            <button
                              type="button"
                              className="admin-btn admin-btn-primary"
                              disabled={
                                detailDisabled || !appointmentLocal.trim()
                              }
                              onClick={() => updateCalendarEvent(selected.id)}
                            >
                              {rescheduling ? "Saving…" : "Save new time"}
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
                        <div className="mt-4 space-y-3">
                          <p className="jobs-section-empty">
                            Cancel this appointment? It will be removed from
                            Google Calendar. If status is Scheduled, it returns
                            to Contacted.
                          </p>
                          <div className="jobs-actions">
                            <button
                              type="button"
                              className="admin-btn admin-btn-primary"
                              disabled={detailDisabled}
                              onClick={() => cancelCalendarEvent(selected.id)}
                            >
                              {cancelling ? "Cancelling…" : "Confirm cancel"}
                            </button>
                            <button
                              type="button"
                              className="admin-btn"
                              disabled={detailDisabled}
                              onClick={() => setShowCancelConfirm(false)}
                            >
                              Keep appointment
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="jobs-actions">
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
                            Cancel appointment
                          </button>
                          <button
                            type="button"
                            className="admin-btn"
                            disabled={detailDisabled}
                            onClick={() => copyCalendarDetails(selected)}
                          >
                            Copy details
                          </button>
                          {selected.google_calendar_event_url ? (
                            <a
                              href={selected.google_calendar_event_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="admin-btn"
                            >
                              Open in Google Calendar
                            </a>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="jobs-divider">
                      <label
                        className="admin-label"
                        htmlFor="appointment-datetime"
                      >
                        Date &amp; time
                      </label>
                      <input
                        id="appointment-datetime"
                        className="admin-input mt-2"
                        type="datetime-local"
                        value={appointmentLocal}
                        disabled={detailDisabled}
                        suppressHydrationWarning
                        onChange={(event) =>
                          setAppointmentLocal(event.target.value)
                        }
                      />
                      <div className="jobs-actions">
                        <button
                          type="button"
                          className="admin-btn admin-btn-primary"
                          disabled={
                            detailDisabled || !appointmentLocal.trim()
                          }
                          onClick={() => createCalendarEvent(selected.id)}
                        >
                          {scheduling ? "Scheduling…" : "Schedule appointment"}
                        </button>
                        <button
                          type="button"
                          className="admin-btn"
                          disabled={detailDisabled}
                          onClick={() => copyCalendarDetails(selected)}
                        >
                          Copy details
                        </button>
                      </div>
                    </div>
                  )}
                </section>

                <JobCommunication
                  key={selected.id}
                  jobId={selected.id}
                  customerEmail={selected.customers?.email}
                  disabled={detailDisabled}
                />

                <section className="jobs-panel">
                  <h3 className="jobs-section-title">Notes</h3>
                  <p className="admin-label">Client notes</p>
                  <p className="jobs-notes-body">
                    {selected.customer_notes || "No client notes on this job."}
                  </p>
                  <p className="admin-label mt-4">Private notes</p>
                  <PrivateNotesEditor
                    key={selected.id}
                    savedNotes={selected.internal_notes || ""}
                    disabled={detailDisabled}
                    saving={savingNotes}
                    onSave={handleSaveNotes}
                  />
                </section>

                <section className="jobs-panel">
                  <div className="jobs-panel-head">
                    <h3 className="jobs-section-title">Billing</h3>
                    <Link
                      href={`/admin/invoices/new?jobId=${selected.id}`}
                      className="admin-btn admin-btn-primary"
                    >
                      New Invoice
                    </Link>
                  </div>
                  {invoicesLoading ? (
                    <p className="jobs-section-empty">Loading invoices…</p>
                  ) : invoices.length === 0 ? (
                    <p className="jobs-section-empty">No invoices yet.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {invoices.map((invoice) => (
                        <div key={invoice.id} className="jobs-invoice-line">
                          <Link href={`/admin/invoices/${invoice.id}`}>
                            Balance {formatCurrency(Number(invoice.balance_due || 0))}
                            {invoice.paid ? " · Paid" : ""}
                          </Link>
                          <span className="jobs-invoice-date">
                            {formatDate(invoice.created_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <section className="jobs-danger">
                <h3 className="jobs-danger-title">Remove Job</h3>
                {!showDeleteConfirm ? (
                  <>
                    <p className="jobs-danger-copy">
                      Permanently removes this job, its notes, linked invoices,
                      and the Google Calendar appointment when present. Customer
                      and vehicle records stay in the system.
                    </p>
                    <button
                      type="button"
                      className="jobs-danger-btn"
                      disabled={detailDisabled}
                      onClick={() => {
                        setShowCancelConfirm(false);
                        setShowReschedule(false);
                        setShowDeleteConfirm(true);
                      }}
                    >
                      Remove Job…
                    </button>
                  </>
                ) : (
                  <div className="jobs-danger-confirm">
                    <p className="text-sm text-red-200 m-0">
                      Remove Job for{" "}
                      <span className="text-white">
                        {formatCustomerName(selected.customers)}
                      </span>
                      {" — "}
                      <span className="text-white">{selected.service_type}</span>
                      ?
                    </p>
                    <ul>
                      <li>
                        This job and its client, private, and appointment notes
                        will be deleted.
                      </li>
                      <li>Invoices linked to this job will be deleted.</li>
                      <li>
                        Linked Google Calendar appointment
                        {selected.google_calendar_event_id ||
                        selected.scheduled_at
                          ? " will be removed when possible"
                          : " (none on this job)"}
                        .
                      </li>
                      <li>
                        Gmail messages remain in the sales mailbox (not stored on
                        the job).
                      </li>
                    </ul>
                    <div className="jobs-actions">
                      <button
                        type="button"
                        className="admin-btn admin-btn-primary"
                        disabled={detailDisabled}
                        onClick={() => handleDeleteJob(selected.id)}
                      >
                        {deletingJob ? "Removing…" : "Confirm remove"}
                      </button>
                      <button
                        type="button"
                        className="admin-btn"
                        disabled={detailDisabled}
                        onClick={() => setShowDeleteConfirm(false)}
                      >
                        Keep job
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
