"use client";

import { useMemo, useState } from "react";
import {
  formatCurrency,
  formatDate,
  formatVehicleShort,
} from "@/lib/utils/format";

type CustomerCard = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  vehicles: Array<Record<string, unknown>>;
  jobs: Array<Record<string, unknown>>;
  invoices: Array<Record<string, unknown>>;
};

function customerLabel(customer: {
  first_name?: string | null;
  last_name?: string | null;
}) {
  return (
    `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
    "Unknown Customer"
  );
}

export default function CustomersClient({
  initialCustomers,
}: {
  initialCustomers: CustomerCard[];
}) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [archiving, setArchiving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const confirming = useMemo(
    () => customers.find((customer) => customer.id === confirmId) || null,
    [customers, confirmId],
  );

  const appointmentCount = confirming
    ? confirming.jobs.filter(
        (job) => job.google_calendar_event_id || job.scheduled_at,
      ).length
    : 0;

  const expectedPhrase = confirming
    ? `ARCHIVE ${customerLabel(confirming)}`.toUpperCase()
    : "";

  async function archiveCustomer(customer: CustomerCard) {
    if (confirmText.trim().toUpperCase() !== expectedPhrase) {
      setFeedback({
        type: "error",
        text: `Type ${expectedPhrase} exactly to confirm.`,
      });
      return;
    }

    setArchiving(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFeedback({
          type: "error",
          text: data.error || "Customer could not be archived.",
        });
        return;
      }

      setCustomers((current) =>
        current.filter((item) => item.id !== customer.id),
      );
      setConfirmId(null);
      setConfirmText("");
      setExpandedId(null);
      setFeedback({
        type: "success",
        text: `${customerLabel(customer)} archived. ${Number(data.jobsArchived || 0)} job(s) hidden from active lists. Invoices and vehicles were preserved.`,
      });
    } catch {
      setFeedback({
        type: "error",
        text: "Network error while archiving customer.",
      });
    } finally {
      setArchiving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--dv8-muted)]">
          Customers
        </p>
        <h1 className="mt-2 text-3xl font-light tracking-tight">Customers</h1>
      </div>

      {feedback ? (
        <div
          className={`admin-panel px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-[rgba(34,197,94,0.35)] text-green-300"
              : "border-[rgba(239,68,68,0.35)] text-red-300"
          }`}
        >
          {feedback.text}
        </div>
      ) : null}

      <div className="space-y-4">
        {customers.length === 0 ? (
          <div className="admin-panel p-5 text-sm text-[var(--dv8-muted)]">
            No customers yet. Jobs and website quotes will populate this list.
          </div>
        ) : (
          customers.map((customer) => {
            const isExpanded = expandedId === customer.id;
            const isConfirming = confirmId === customer.id;
            return (
              <div key={customer.id} className="admin-panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <button
                    type="button"
                    className="min-w-0 text-left"
                    onClick={() =>
                      setExpandedId((current) =>
                        current === customer.id ? null : customer.id,
                      )
                    }
                  >
                    <h2 className="text-xl font-light">
                      {customerLabel(customer)}
                    </h2>
                    <p className="text-sm text-[var(--dv8-muted)]">
                      {customer.phone || "—"}
                    </p>
                    <p className="text-sm text-[var(--dv8-muted)]">
                      {customer.email || "—"}
                    </p>
                  </button>
                  <button
                    type="button"
                    className="admin-btn"
                    onClick={() =>
                      setExpandedId((current) =>
                        current === customer.id ? null : customer.id,
                      )
                    }
                  >
                    {isExpanded ? "Hide Detail" : "View Detail"}
                  </button>
                </div>

                {isExpanded ? (
                  <div className="mt-6 space-y-6">
                    <div className="grid gap-6 lg:grid-cols-3">
                      <div>
                        <p className="admin-label">Vehicles Owned</p>
                        <div className="space-y-2 text-sm">
                          {customer.vehicles.length === 0 ? (
                            <p className="text-[var(--dv8-muted)]">—</p>
                          ) : (
                            customer.vehicles.map((vehicle) => (
                              <p key={String(vehicle.id)}>
                                {formatVehicleShort(vehicle as never)}
                              </p>
                            ))
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="admin-label">Job History</p>
                        <div className="space-y-2 text-sm">
                          {customer.jobs.length === 0 ? (
                            <p className="text-[var(--dv8-muted)]">—</p>
                          ) : (
                            customer.jobs.slice(0, 8).map((job) => (
                              <p key={String(job.id)}>
                                {formatVehicleShort(job.vehicles as never)} ·{" "}
                                {String(job.service_type)} ·{" "}
                                {String(job.status)}
                              </p>
                            ))
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="admin-label">Invoice History</p>
                        <div className="space-y-2 text-sm">
                          {customer.invoices.length === 0 ? (
                            <p className="text-[var(--dv8-muted)]">—</p>
                          ) : (
                            customer.invoices.slice(0, 8).map((invoice) => (
                              <p key={String(invoice.id)}>
                                {formatCurrency(
                                  Number(invoice.balance_due || 0),
                                )}{" "}
                                · {formatDate(String(invoice.created_at))}
                              </p>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-[rgba(239,68,68,0.25)] pt-5">
                      <p className="admin-label text-red-300">Delete Customer</p>
                      {!isConfirming ? (
                        <div className="mt-3 space-y-3">
                          <p className="text-sm text-[var(--dv8-muted)]">
                            Customers are archived (soft-deleted), not hard
                            deleted. Database foreign keys use{" "}
                            <code>ON DELETE SET NULL</code>, so permanent
                            deletion would orphan jobs, invoices, and vehicles.
                          </p>
                          <button
                            type="button"
                            className="admin-btn"
                            onClick={() => {
                              setConfirmId(customer.id);
                              setConfirmText("");
                              setFeedback(null);
                            }}
                          >
                            Archive Customer…
                          </button>
                        </div>
                      ) : (
                        <div className="mt-3 space-y-3">
                          <p className="text-sm text-red-200">
                            Archive{" "}
                            <span className="text-white">
                              {customerLabel(customer)}
                            </span>
                            ? This is stronger than job deletion and cannot be
                            undone from the UI.
                          </p>
                          <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--dv8-muted)]">
                            <li>
                              {customer.jobs.length} active job
                              {customer.jobs.length === 1 ? "" : "s"} will be
                              archived and hidden from the jobs list.
                            </li>
                            <li>
                              {appointmentCount} appointment
                              {appointmentCount === 1 ? "" : "s"} associated
                              (calendar/schedule fields remain on archived
                              jobs).
                            </li>
                            <li>
                              {customer.invoices.length} invoice
                              {customer.invoices.length === 1 ? "" : "s"} and{" "}
                              {customer.vehicles.length} vehicle
                              {customer.vehicles.length === 1 ? "" : "s"} stay
                              linked and are not deleted.
                            </li>
                            <li>
                              Website lead rows and Gmail threads are not
                              deleted.
                            </li>
                          </ul>
                          <label className="block text-sm">
                            <span className="admin-label">
                              Type {expectedPhrase} to confirm
                            </span>
                            <input
                              className="admin-input mt-2"
                              value={confirmText}
                              onChange={(e) => setConfirmText(e.target.value)}
                              disabled={archiving}
                              autoComplete="off"
                            />
                          </label>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="admin-btn admin-btn-primary"
                              disabled={archiving}
                              onClick={() => archiveCustomer(customer)}
                            >
                              {archiving
                                ? "Archiving…"
                                : "Confirm Archive Customer"}
                            </button>
                            <button
                              type="button"
                              className="admin-btn"
                              disabled={archiving}
                              onClick={() => {
                                setConfirmId(null);
                                setConfirmText("");
                              }}
                            >
                              Keep Customer
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
