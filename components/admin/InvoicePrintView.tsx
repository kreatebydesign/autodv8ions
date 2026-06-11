"use client";

import Image from "next/image";
import type { Invoice } from "@/lib/types/database";
import { formatCurrency, formatCustomerName, formatDate } from "@/lib/utils/format";

export default function InvoicePrintView({ invoice }: { invoice: Invoice }) {
  const subtotal = invoice.line_items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <div className="invoice-print admin-panel p-8">
      <div className="mb-8 flex items-start justify-between gap-6">
        <Image
          src="/images/logos/autodv8ions-hero-logo.png"
          alt="AutoDV8ions"
          width={220}
          height={80}
          className="h-14 w-auto object-contain"
        />
        <div className="text-right text-sm">
          <p className="font-medium">AutoDV8ions</p>
          <p>Altoona, PA</p>
          <p>sales@autodv8ions.com</p>
        </div>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-2">
        <div>
          <p className="admin-label">Bill To</p>
          <p>{formatCustomerName(invoice.customers)}</p>
          <p className="text-sm">{invoice.customers?.phone}</p>
          <p className="text-sm">{invoice.customers?.email}</p>
        </div>
        <div className="md:text-right">
          <p className="admin-label">Invoice</p>
          <p>#{invoice.id.slice(0, 8).toUpperCase()}</p>
          <p className="text-sm">{formatDate(invoice.created_at)}</p>
          <p className="text-sm">{invoice.paid ? "Paid" : "Unpaid"}</p>
        </div>
      </div>

      {invoice.vehicle_summary && (
        <div className="mb-6">
          <p className="admin-label">Vehicle</p>
          <p>{invoice.vehicle_summary}</p>
        </div>
      )}

      <table className="admin-table mb-8">
        <thead>
          <tr>
            <th>Service</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.line_items.map((item, index) => (
            <tr key={index}>
              <td>{item.description}</td>
              <td>{formatCurrency(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto max-w-xs space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Deposit</span>
          <span>{formatCurrency(invoice.deposit)}</span>
        </div>
        <div className="flex justify-between border-t border-[var(--dv8-border)] pt-2 text-base">
          <span>Balance Due</span>
          <span>{formatCurrency(invoice.balance_due)}</span>
        </div>
      </div>

      {invoice.notes && (
        <div className="mt-8">
          <p className="admin-label">Notes</p>
          <p className="text-sm">{invoice.notes}</p>
        </div>
      )}

      <div className="admin-no-print mt-8 flex gap-3">
        <button type="button" className="admin-btn admin-btn-primary" onClick={() => window.print()}>
          Print Invoice
        </button>
        <button type="button" className="admin-btn" onClick={() => window.print()}>
          Download PDF
        </button>
      </div>
    </div>
  );
}
