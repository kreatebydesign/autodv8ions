import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  const { error } = await requireAdminSession();
  if (error) return error;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ customers: [], configured: false });
  }

  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  if (customersError) {
    return NextResponse.json({ error: customersError.message }, { status: 500 });
  }

  const enriched = await Promise.all(
    (customers || []).map(async (customer) => {
      const [{ data: vehicles }, { data: jobs }, { data: invoices }] =
        await Promise.all([
          supabase.from("vehicles").select("*").eq("customer_id", customer.id),
          supabase
            .from("jobs")
            .select("*, vehicles(*)")
            .eq("customer_id", customer.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("invoices")
            .select("*")
            .eq("customer_id", customer.id)
            .order("created_at", { ascending: false }),
        ]);

      return { ...customer, vehicles: vehicles || [], jobs: jobs || [], invoices: invoices || [] };
    }),
  );

  return NextResponse.json({ customers: enriched, configured: true });
}
