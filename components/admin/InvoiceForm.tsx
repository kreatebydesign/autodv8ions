"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type LineItem = { description: string; amount: number };

export default function InvoiceForm({
  jobId,
  customerId,
  vehicleSummary,
}: {
  jobId?: string;
  customerId?: string;
  vehicleSummary?: string;
}) {
  const router = useRouter();
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "Service", amount: 0 },
  ]);
  const [deposit, setDeposit] = useState(0);
  const [notes, setNotes] = useState("");
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const subtotal = lineItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const balanceDue = subtotal - deposit;

  function updateLine(index: number, field: keyof LineItem, value: string) {
    setLineItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: field === "amount" ? Number(value) : value,
            }
          : item,
      ),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId,
        customerId,
        vehicleSummary,
        lineItems,
        deposit,
        balanceDue,
        paid,
        notes,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to create invoice.");
      return;
    }

    router.push(`/admin/invoices/${data.invoice.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="admin-panel space-y-5 p-6">
      <div>
        <p className="admin-label">Vehicle</p>
        <p>{vehicleSummary || "—"}</p>
      </div>

      <div className="space-y-3">
        <p className="admin-label">Line Items</p>
        {lineItems.map((item, index) => (
          <div key={index} className="grid gap-3 md:grid-cols-[1fr_160px]">
            <input
              className="admin-input"
              value={item.description}
              onChange={(e) => updateLine(index, "description", e.target.value)}
              placeholder="Description"
            />
            <input
              className="admin-input"
              type="number"
              step="0.01"
              value={item.amount}
              onChange={(e) => updateLine(index, "amount", e.target.value)}
              placeholder="Amount"
            />
          </div>
        ))}
        <button
          type="button"
          className="admin-btn"
          onClick={() => setLineItems((prev) => [...prev, { description: "", amount: 0 }])}
        >
          Add Line Item
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="admin-label">Deposit</label>
          <input className="admin-input" type="number" step="0.01" value={deposit} onChange={(e) => setDeposit(Number(e.target.value))} />
        </div>
        <div>
          <label className="admin-label">Balance Due</label>
          <input className="admin-input" value={balanceDue.toFixed(2)} readOnly />
        </div>
      </div>

      <div>
        <label className="admin-label">Notes</label>
        <textarea className="admin-input min-h-24" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
        Mark as paid
      </label>

      {error && <p className="text-sm text-[var(--dv8-red-bright)]">{error}</p>}

      <button type="submit" className="admin-btn admin-btn-primary" disabled={loading}>
        {loading ? "Saving..." : "Create Invoice"}
      </button>
    </form>
  );
}
