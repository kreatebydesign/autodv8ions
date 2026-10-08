import CustomersClient from "@/components/admin/CustomersClient";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import "../../admin-customers.css";

type CustomerRow = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  email?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  archived_at?: string | null;
  vehicles?: Array<Record<string, unknown>> | null;
  jobs?: Array<Record<string, unknown> & { archived_at?: string | null }> | null;
  invoices?: Array<Record<string, unknown>> | null;
};

export default async function AdminCustomersPage() {
  const supabase = getSupabaseAdmin();
  let customers: Array<Record<string, unknown>> = [];

  if (supabase) {
    // Single nested select — avoids per-customer N+1 (162 customers × 3 queries)
    // that previously stalled this route and overflowed RSC serialization.
    const { data, error } = await supabase
      .from("customers")
      .select("*, vehicles(*), jobs(*, vehicles(*)), invoices(*)")
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[admin/customers]", error.message);
    }

    customers = ((data || []) as CustomerRow[]).map((customer) => ({
      id: customer.id,
      first_name: customer.first_name ?? "",
      last_name: customer.last_name ?? "",
      phone: customer.phone ?? null,
      email: customer.email ?? null,
      created_at: customer.created_at ?? null,
      updated_at: customer.updated_at ?? null,
      archived_at: customer.archived_at ?? null,
      vehicles: Array.isArray(customer.vehicles) ? customer.vehicles : [],
      // Preserve prior active-job filter (.is("archived_at", null) on jobs query).
      jobs: Array.isArray(customer.jobs)
        ? customer.jobs.filter((job) => job.archived_at == null)
        : [],
      invoices: Array.isArray(customer.invoices) ? customer.invoices : [],
    }));
  }

  return <CustomersClient initialCustomers={customers as never} />;
}
