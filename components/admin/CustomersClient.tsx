"use client";

import { useMemo, useState } from "react";
import JobStatusBadge from "@/components/admin/JobStatusBadge";
import {
  formatCurrency,
  formatDate,
  formatEmailLink,
  formatPhoneLink,
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

function primaryVehicle(customer: CustomerCard) {
  return customer.vehicles[0]
    ? formatVehicleShort(customer.vehicles[0] as never)
    : null;
}

function recentJob(customer: CustomerCard) {
  return customer.jobs[0] || null;
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

/** Display-only US formatting; does not alter the stored phone value. */
function formatPhoneDisplay(phone?: string | null) {
  if (!phone) return null;
  const digits = digitsOnly(phone);
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

function matchesCustomer(customer: CustomerCard, query: string) {
  if (!query) return true;
  const haystack = [
    customerLabel(customer),
    customer.phone,
    customer.email,
    digitsOnly(customer.phone),
    ...customer.vehicles.flatMap((vehicle) => [
      vehicle.year,
      vehicle.make,
      vehicle.model,
      formatVehicleShort(vehicle as never),
    ]),
  ]
    .map(normalizeSearch)
    .join(" ");
  return haystack.includes(query);
}

export default function CustomersClient({
  initialCustomers,
}: {
  initialCustomers: CustomerCard[];
}) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialCustomers[0]?.id ?? null,
  );
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [archiving, setArchiving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const normalizedQuery = normalizeSearch(query);

  const visibleCustomers = useMemo(
    () => customers.filter((customer) => matchesCustomer(customer, normalizedQuery)),
    [customers, normalizedQuery],
  );

  // Derive selection from the filtered list (no effect) so search/archive
  // never leave a stale id selected and never trip set-state-in-effect.
  const selected =
    visibleCustomers.find((customer) => customer.id === selectedId) ||
    visibleCustomers[0] ||
    null;

  const confirming = confirmId === selected?.id ? selected : null;

  const appointmentCount = confirming
    ? confirming.jobs.filter(
        (job) => job.google_calendar_event_id || job.scheduled_at,
      ).length
    : 0;

  const expectedPhrase = confirming
    ? `ARCHIVE ${customerLabel(confirming)}`.toUpperCase()
    : "";

  function selectCustomer(id: string) {
    setSelectedId(id);
    setConfirmId(null);
    setConfirmText("");
    setMobileShowDetail(true);
  }

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
      setMobileShowDetail(false);
      setFeedback({
        type: "success",
        text: `${customerLabel(customer)} archived. ${Number(data.jobsArchived || 0)} active job(s) hidden from the jobs list.`,
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
    <div className="crm-customers">
      <div className="crm-customers-header">
        <div>
          <h1 className="crm-customers-title">Clients</h1>
          <p className="crm-customers-count">
            {customers.length} active client
            {customers.length === 1 ? "" : "s"}
            {normalizedQuery
              ? ` · ${visibleCustomers.length} match${visibleCustomers.length === 1 ? "" : "es"}`
              : ""}
          </p>
        </div>
        <div className="crm-customers-search">
          <label className="sr-only" htmlFor="customer-search">
            Search clients
          </label>
          <input
            id="customer-search"
            type="search"
            className="crm-customers-search-input"
            placeholder="Search name, phone, email, vehicle…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
          />
          {query ? (
            <button
              type="button"
              className="crm-customers-search-clear"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {feedback ? (
        <div
          className={`crm-customers-feedback${
            feedback.type === "success" ? " is-success" : " is-error"
          }`}
          role="status"
        >
          {feedback.text}
        </div>
      ) : null}

      <div
        className={`crm-customers-shell${
          mobileShowDetail && selected ? " is-detail" : ""
        }`}
      >
        <div className="crm-customers-list" role="listbox" aria-label="Clients">
          {customers.length === 0 ? (
            <p className="crm-customers-empty">
              No clients yet. Jobs and website quotes will populate this list.
            </p>
          ) : visibleCustomers.length === 0 ? (
            <p className="crm-customers-empty">No clients match that search.</p>
          ) : (
            visibleCustomers.map((customer) => {
              const vehicle = primaryVehicle(customer);
              const job = recentJob(customer);
              const phoneDisplay = formatPhoneDisplay(customer.phone);
              const secondary =
                phoneDisplay || customer.email || null;
              return (
                <button
                  key={customer.id}
                  type="button"
                  role="option"
                  aria-selected={selected?.id === customer.id}
                  className={`crm-customers-row${
                    selected?.id === customer.id ? " is-active" : ""
                  }`}
                  onClick={() => selectCustomer(customer.id)}
                >
                  <p className="crm-customers-row-name">
                    {customerLabel(customer)}
                  </p>
                  {vehicle ? (
                    <p className="crm-customers-row-vehicle">{vehicle}</p>
                  ) : null}
                  {secondary ? (
                    <p className="crm-customers-row-meta">{secondary}</p>
                  ) : null}
                  {job ? (
                    <p className="crm-customers-row-job">
                      {String(job.service_type || "Job")} ·{" "}
                      {String(job.status || "—")}
                    </p>
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        <div className="crm-customers-detail">
          <button
            type="button"
            className="crm-customers-back"
            onClick={() => {
              setMobileShowDetail(false);
              setConfirmId(null);
              setConfirmText("");
            }}
          >
            ← Clients
          </button>

          {!selected ? (
            <p className="crm-customers-placeholder">
              {visibleCustomers.length === 0
                ? "No clients match that search."
                : "Select a client to view vehicles, jobs, and invoices."}
            </p>
          ) : (
            <div className="crm-customers-record">
              <header className="crm-customers-record-head">
                <h2 className="crm-customers-detail-name">
                  {customerLabel(selected)}
                </h2>
                <div className="crm-customers-detail-contact">
                  {selected.phone ? (
                    <a
                      className="crm-customers-contact-link"
                      href={formatPhoneLink(selected.phone) || undefined}
                    >
                      {formatPhoneDisplay(selected.phone)}
                    </a>
                  ) : (
                    <span className="crm-customers-contact-muted">No phone</span>
                  )}
                  {selected.email ? (
                    <a
                      className="crm-customers-contact-link"
                      href={formatEmailLink(selected.email) || undefined}
                    >
                      {selected.email}
                    </a>
                  ) : (
                    <span className="crm-customers-contact-muted">No email</span>
                  )}
                </div>
              </header>

              <div className="crm-customers-record-body">
                <section className="crm-customers-panel">
                  <h3 className="crm-customers-section-title">Vehicles</h3>
                  {selected.vehicles.length === 0 ? (
                    <p className="crm-customers-section-empty">
                      No vehicles yet.
                    </p>
                  ) : (
                    <div className="crm-customers-lines">
                      {selected.vehicles.map((vehicle) => (
                        <div
                          key={String(vehicle.id)}
                          className="crm-customers-vehicle"
                        >
                          <span className="crm-customers-vehicle-label">
                            {formatVehicleShort(vehicle as never)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="crm-customers-panel">
                  <h3 className="crm-customers-section-title">Job History</h3>
                  {selected.jobs.length === 0 ? (
                    <p className="crm-customers-section-empty">No jobs yet.</p>
                  ) : (
                    <div className="crm-customers-lines">
                      {selected.jobs.slice(0, 12).map((job) => (
                        <div
                          key={String(job.id)}
                          className="crm-customers-job"
                        >
                          <div className="crm-customers-job-main">
                            <span className="crm-customers-job-vehicle">
                              {formatVehicleShort(job.vehicles as never)}
                            </span>
                            <span className="crm-customers-job-service">
                              {String(job.service_type || "Service")}
                            </span>
                          </div>
                          <div className="crm-customers-job-aside">
                            <JobStatusBadge
                              status={String(job.status || "—")}
                            />
                            <span className="crm-customers-job-date">
                              {formatDate(
                                String(
                                  job.scheduled_at || job.created_at || "",
                                ),
                              )}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="crm-customers-panel">
                  <h3 className="crm-customers-section-title">
                    Invoice History
                  </h3>
                  {selected.invoices.length === 0 ? (
                    <p className="crm-customers-section-empty">
                      No invoices yet.
                    </p>
                  ) : (
                    <div className="crm-customers-lines">
                      {selected.invoices.slice(0, 12).map((invoice) => (
                        <div
                          key={String(invoice.id)}
                          className="crm-customers-invoice"
                        >
                          <span className="crm-customers-invoice-balance">
                            Balance{" "}
                            {formatCurrency(Number(invoice.balance_due || 0))}
                          </span>
                          <span className="crm-customers-invoice-date">
                            {formatDate(String(invoice.created_at || ""))}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <section className="crm-customers-status">
                <h3 className="crm-customers-status-title">Customer Status</h3>
                <p className="crm-customers-status-copy">
                  Removes this customer from the active client list without
                  removing their job history.
                </p>

                {confirmId !== selected.id ? (
                  <button
                    type="button"
                    className="crm-customers-archive-btn"
                    onClick={() => {
                      setConfirmId(selected.id);
                      setConfirmText("");
                      setFeedback(null);
                    }}
                  >
                    Archive customer
                  </button>
                ) : (
                  <div className="crm-customers-confirm">
                    <p className="crm-customers-confirm-title">
                      Archive {customerLabel(selected)}?
                    </p>
                    <ul className="crm-customers-confirm-list">
                      <li>
                        {selected.jobs.length} active job
                        {selected.jobs.length === 1 ? "" : "s"} will be hidden
                        from the jobs list.
                      </li>
                      <li>
                        {appointmentCount} appointment
                        {appointmentCount === 1 ? "" : "s"} remain associated
                        with archived job records.
                      </li>
                      <li>
                        {selected.invoices.length} invoice
                        {selected.invoices.length === 1 ? "" : "s"} and{" "}
                        {selected.vehicles.length} vehicle
                        {selected.vehicles.length === 1 ? "" : "s"} stay linked.
                      </li>
                    </ul>
                    <label className="block text-sm">
                      <span className="admin-label">
                        Type {expectedPhrase} to confirm
                      </span>
                      <input
                        className="admin-input mt-2"
                        value={confirmText}
                        onChange={(event) => setConfirmText(event.target.value)}
                        disabled={archiving}
                        autoComplete="off"
                      />
                    </label>
                    <div className="crm-customers-confirm-actions">
                      <button
                        type="button"
                        className="admin-btn admin-btn-primary"
                        disabled={archiving}
                        onClick={() => archiveCustomer(selected)}
                      >
                        {archiving ? "Archiving…" : "Confirm archive"}
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
                        Keep customer
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
