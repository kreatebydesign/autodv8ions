"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import JobStatusBadge from "@/components/admin/JobStatusBadge";
import { JOB_STATUSES, SERVICE_TYPES } from "@/lib/constants/jobs";
import type { Job } from "@/lib/types/database";
import { buildCalendarDetails, formatCustomerName, formatVehicleShort } from "@/lib/utils/format";

export default function JobsClient({ initialJobs }: { initialJobs: Job[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState(initialJobs);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [serviceType, setServiceType] = useState(searchParams.get("serviceType") || "");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const selected = jobs.find((job) => job.id === selectedId) || null;

  async function refreshJobs() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (serviceType) params.set("serviceType", serviceType);
    const res = await fetch(`/api/jobs?${params.toString()}`);
    const data = await res.json();
    setJobs(data.jobs || []);
  }

  async function updateJob(id: string, payload: Record<string, unknown>) {
    setLoading(true);
    setMessage("");
    const res = await fetch(`/api/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(data.error || "Update failed.");
      return;
    }
    setJobs((prev) => prev.map((job) => (job.id === id ? data.job : job)));
    setMessage("Job updated.");
  }

  async function createCalendarEvent(id: string) {
    setLoading(true);
    setMessage("");
    const res = await fetch(`/api/jobs/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create-calendar-event" }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(data.error || "Calendar event failed.");
      return;
    }
    setJobs((prev) => prev.map((job) => (job.id === id ? data.job : job)));
    setMessage("Google Calendar event created.");
  }

  async function copyCalendarDetails(job: Job) {
    await navigator.clipboard.writeText(buildCalendarDetails(job));
    setMessage("Calendar details copied.");
  }

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

      {message && <div className="admin-panel px-4 py-3 text-sm text-[var(--dv8-muted)]">{message}</div>}

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
                  onClick={() => setSelectedId(job.id)}
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
            <div className="space-y-4">
              <div>
                <p className="admin-label">Customer</p>
                <p>{formatCustomerName(selected.customers)}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-sm">
                  {selected.customers?.phone && (
                    <a className="text-[var(--dv8-red-bright)]" href={`tel:${selected.customers.phone}`}>
                      Call
                    </a>
                  )}
                  {selected.customers?.email && (
                    <a className="text-[var(--dv8-red-bright)]" href={`mailto:${selected.customers.email}`}>
                      Email
                    </a>
                  )}
                </div>
              </div>

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
                <p className="admin-label">Status</p>
                <select
                  className="admin-input"
                  value={selected.status}
                  disabled={loading}
                  onChange={(e) => updateJob(selected.id, { status: e.target.value })}
                >
                  {JOB_STATUSES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="admin-label">Customer Notes</p>
                <p className="text-sm text-[var(--dv8-muted)]">{selected.customer_notes || "—"}</p>
              </div>

              <div>
                <p className="admin-label">Internal Notes</p>
                <textarea
                  className="admin-input min-h-24"
                  defaultValue={selected.internal_notes || ""}
                  onBlur={(e) => {
                    if (e.target.value !== (selected.internal_notes || "")) {
                      updateJob(selected.id, { internalNotes: e.target.value });
                    }
                  }}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" className="admin-btn" disabled={loading} onClick={() => copyCalendarDetails(selected)}>
                  Copy Calendar Details
                </button>
                <button type="button" className="admin-btn admin-btn-primary" disabled={loading} onClick={() => createCalendarEvent(selected.id)}>
                  Create Google Calendar Event
                </button>
                {selected.google_calendar_event_url && (
                  <a href={selected.google_calendar_event_url} target="_blank" rel="noopener noreferrer" className="admin-btn">
                    Open Event
                  </a>
                )}
                <button type="button" className="admin-btn" onClick={() => router.push(`/admin/invoices/new?jobId=${selected.id}`)}>
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
