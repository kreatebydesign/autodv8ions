import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { formatCurrency, formatCustomerName, formatDate } from "@/lib/utils/format";

export default async function AdminInvoicesPage() {
  const supabase = getSupabaseAdmin();
  let invoices: Array<Record<string, unknown>> = [];

  if (supabase) {
    const { data } = await supabase
      .from("invoices")
      .select("*, customers(*)")
      .order("created_at", { ascending: false });
    invoices = data || [];
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--dv8-muted)]">
            Billing
          </p>
          <h1 className="mt-2 text-3xl font-light tracking-tight">Invoices</h1>
        </div>
        <Link href="/admin/invoices/new" className="admin-btn admin-btn-primary">
          New Invoice
        </Link>
      </div>

      <div className="admin-panel overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Vehicle</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={String(invoice.id)}>
                <td>{formatCustomerName(invoice.customers as never)}</td>
                <td>{String(invoice.vehicle_summary || "—")}</td>
                <td>{formatCurrency(Number(invoice.balance_due || 0))}</td>
                <td>{invoice.paid ? "Paid" : "Unpaid"}</td>
                <td>{formatDate(String(invoice.created_at))}</td>
                <td>
                  <Link href={`/admin/invoices/${invoice.id}`} className="admin-btn">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
