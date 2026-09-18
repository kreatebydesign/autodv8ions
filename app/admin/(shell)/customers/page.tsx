import CustomersClient from "@/components/admin/CustomersClient";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export default async function AdminCustomersPage() {
  const supabase = getSupabaseAdmin();
  let customers: Array<Record<string, unknown>> = [];

  if (supabase) {
    const { data } = await supabase
      .from("customers")
      .select("*")
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    customers = await Promise.all(
      (data || []).map(async (customer) => {
        const [{ data: vehicles }, { data: jobs }, { data: invoices }] =
          await Promise.all([
            supabase.from("vehicles").select("*").eq("customer_id", customer.id),
            supabase
              .from("jobs")
              .select("*, vehicles(*)")
              .eq("customer_id", customer.id)
              .is("archived_at", null)
              .order("created_at", { ascending: false }),
            supabase
              .from("invoices")
              .select("*")
              .eq("customer_id", customer.id)
              .order("created_at", { ascending: false }),
          ]);
        return {
          ...customer,
          vehicles: vehicles || [],
          jobs: jobs || [],
          invoices: invoices || [],
        };
      }),
    );
  }

  return <CustomersClient initialCustomers={customers as never} />;
}
