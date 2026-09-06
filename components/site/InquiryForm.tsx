"use client";

import { useState } from "react";

type InquiryType =
  | "remote_starter"
  | "vehicle_security"
  | "audio_custom"
  | "general_contact";

type FieldConfig = {
  showVehicle?: boolean;
  showProjectFields?: boolean;
  submitLabel: string;
  successTitle: string;
  successCopy: string;
  disclaimer?: string;
};

const CONFIG: Record<InquiryType, FieldConfig> = {
  remote_starter: {
    showVehicle: true,
    submitLabel: "Request More Info",
    successTitle: "Request received",
    successCopy:
      "AutoDV8ions has your remote starter request. We'll review the vehicle details and follow up with next steps.",
  },
  vehicle_security: {
    showVehicle: true,
    submitLabel: "Request More Info",
    successTitle: "Request received",
    successCopy:
      "AutoDV8ions has your security inquiry. We'll review what you shared and follow up with next steps.",
  },
  audio_custom: {
    showVehicle: true,
    showProjectFields: true,
    submitLabel: "Submit Project for Review",
    successTitle: "Project submitted for review",
    successCopy:
      "AutoDV8ions received your project details. Submitting does not guarantee acceptance — we'll review the scope, vehicle, and schedule, then follow up.",
    disclaimer:
      "Select audio and custom upgrade projects are accepted based on scope, vehicle, and schedule. Submitting this form does not guarantee acceptance.",
  },
  general_contact: {
    submitLabel: "Request More Info",
    successTitle: "Message received",
    successCopy:
      "AutoDV8ions has your message. We'll review it and follow up.",
  },
};

export default function InquiryForm({
  inquiryType,
  pageSource,
}: {
  inquiryType: InquiryType;
  pageSource: string;
}) {
  const config = CONFIG[inquiryType];
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    year: "",
    make: "",
    model: "",
    message: "",
    requestedUpgrade: "",
    projectGoals: "",
    timeline: "",
    budgetRange: "",
  });

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          inquiryType,
          pageSource,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Unable to submit right now.");
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Please try again or call the shop.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="panel p-6 sm:p-8">
        <p className="label-mono mb-3 text-[var(--accent)]/80">Received</p>
        <h3 className="text-xl font-light tracking-tight">{config.successTitle}</h3>
        <p className="mt-3 text-sm leading-relaxed text-white/45">
          {config.successCopy}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="panel space-y-5 p-6 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label-mono mb-2 block text-white/35">First name</span>
          <input
            required
            className="site-input"
            value={form.firstName}
            onChange={(e) => update("firstName", e.target.value)}
          />
        </label>
        <label className="block">
          <span className="label-mono mb-2 block text-white/35">Last name</span>
          <input
            required
            className="site-input"
            value={form.lastName}
            onChange={(e) => update("lastName", e.target.value)}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label-mono mb-2 block text-white/35">Phone</span>
          <input
            required
            type="tel"
            className="site-input"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
          />
        </label>
        <label className="block">
          <span className="label-mono mb-2 block text-white/35">Email</span>
          <input
            type="email"
            className="site-input"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </label>
      </div>

      {config.showVehicle ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="label-mono mb-2 block text-white/35">Year</span>
            <input
              className="site-input"
              value={form.year}
              onChange={(e) => update("year", e.target.value)}
            />
          </label>
          <label className="block">
            <span className="label-mono mb-2 block text-white/35">Make</span>
            <input
              className="site-input"
              value={form.make}
              onChange={(e) => update("make", e.target.value)}
            />
          </label>
          <label className="block">
            <span className="label-mono mb-2 block text-white/35">Model</span>
            <input
              className="site-input"
              value={form.model}
              onChange={(e) => update("model", e.target.value)}
            />
          </label>
        </div>
      ) : null}

      {config.showProjectFields ? (
        <>
          <label className="block">
            <span className="label-mono mb-2 block text-white/35">
              Requested upgrade
            </span>
            <input
              className="site-input"
              value={form.requestedUpgrade}
              onChange={(e) => update("requestedUpgrade", e.target.value)}
              placeholder="Audio, lighting, convenience, other"
            />
          </label>
          <label className="block">
            <span className="label-mono mb-2 block text-white/35">
              Project goals
            </span>
            <textarea
              className="site-input min-h-24"
              value={form.projectGoals}
              onChange={(e) => update("projectGoals", e.target.value)}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label-mono mb-2 block text-white/35">
                Desired timeline
              </span>
              <select
                className="site-input"
                value={form.timeline}
                onChange={(e) => update("timeline", e.target.value)}
              >
                <option value="">Select…</option>
                <option value="Flexible">Flexible</option>
                <option value="This month">This month</option>
                <option value="1–3 months">1–3 months</option>
                <option value="Planning ahead">Planning ahead</option>
              </select>
            </label>
            <label className="block">
              <span className="label-mono mb-2 block text-white/35">
                Budget range
              </span>
              <select
                className="site-input"
                value={form.budgetRange}
                onChange={(e) => update("budgetRange", e.target.value)}
              >
                <option value="">Select…</option>
                <option value="Under $500">Under $500</option>
                <option value="$500–$1,500">$500–$1,500</option>
                <option value="$1,500–$3,000">$1,500–$3,000</option>
                <option value="$3,000+">$3,000+</option>
                <option value="Not sure yet">Not sure yet</option>
              </select>
            </label>
          </div>
        </>
      ) : null}

      <label className="block">
        <span className="label-mono mb-2 block text-white/35">
          {config.showProjectFields ? "Additional notes" : "How can we help?"}
        </span>
        <textarea
          className="site-input min-h-28"
          value={form.message}
          onChange={(e) => update("message", e.target.value)}
        />
      </label>

      {config.disclaimer ? (
        <p className="text-xs leading-relaxed text-white/35">{config.disclaimer}</p>
      ) : null}

      {error ? <p className="text-sm text-red-300/90">{error}</p> : null}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center gap-3 border border-white/15 bg-white/[0.05] px-6 py-3 text-xs uppercase tracking-[0.15em] text-white transition-all duration-500 hover:border-[var(--accent-dim)] hover:bg-white/[0.08] disabled:opacity-40"
      >
        {busy ? "Sending…" : config.submitLabel}
      </button>
    </form>
  );
}
