import { getSupabaseAdmin } from "@/lib/supabase/server";
import { formatCurrency, formatCustomerName, formatDate, formatVehicleShort } from "@/lib/utils/format";

export default async function AdminCustomersPage() {
  const supabase = getSupabaseAdmin();
  let customers: Array<Record<string, unknown>> = [];

  if (supabase) {
    const { data } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
    customers = await Promise.all(
      (data || []).map(async (customer) => {
        const [{ data: vehicles }, { data: jobs }, { data: invoices }] = await Promise.all([
          supabase.from("vehicles").select("*").eq("customer_id", customer.id),
          supabase.from("jobs").select("*, vehicles(*)").eq("customer_id", customer.id).order("created_at", { ascending: false }),
          supabase.from("invoices").select("*").eq("customer_id", customer.id).order("created_at", { ascending: false }),
        ]);
        return { ...customer, vehicles: vehicles || [], jobs: jobs || [], invoices: invoices || [] };
      }),
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--dv8-muted)]">
          Customers
        </p>
        <h1 className="mt-2 text-3xl font-light tracking-tight">Customers</h1>
      </div>

      <div className="space-y-4">
        {customers.length === 0 ? (
          <div className="admin-panel p-5 text-sm text-[var(--dv8-muted)]">
            No customers yet. Jobs and website quotes will populate this list.
          </div>
        ) : (
          customers.map((customer) => (
            <div key={String(customer.id)} className="admin-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-light">{formatCustomerName(customer as never)}</h2>
                  <p className="text-sm text-[var(--dv8-muted)]">{String(customer.phone || "—")}</p>
                  <p className="text-sm text-[var(--dv8-muted)]">{String(customer.email || "—")}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <div>
                  <p className="admin-label">Vehicles Owned</p>
                  <div className="space-y-2 text-sm">
                    {(customer.vehicles as Array<Record<string, unknown>>).length === 0 ? (
                      <p className="text-[var(--dv8-muted)]">—</p>
                    ) : (
                      (customer.vehicles as Array<Record<string, unknown>>).map((vehicle) => (
                        <p key={String(vehicle.id)}>{formatVehicleShort(vehicle as never)}</p>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <p className="admin-label">Job History</p>
                  <div className="space-y-2 text-sm">
                    {(customer.jobs as Array<Record<string, unknown>>).slice(0, 5).map((job) => (
                      <p key={String(job.id)}>
                        {formatVehicleShort(job.vehicles as never)} · {String(job.service_type)} · {String(job.status)}
                      </p>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="admin-label">Invoice History</p>
                  <div className="space-y-2 text-sm">
                    {(customer.invoices as Array<Record<string, unknown>>).slice(0, 5).map((invoice) => (
                      <p key={String(invoice.id)}>
                        {formatCurrency(Number(invoice.balance_due || 0))} · {formatDate(String(invoice.created_at))}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
