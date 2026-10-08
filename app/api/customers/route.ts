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

  // Keep list enrichment in one nested query (same shape as the admin page).
  // Avoids per-customer N+1 fan-out that can stall under real CRM volume.
  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select("*, vehicles(*), jobs(*, vehicles(*)), invoices(*)")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (customersError) {
    return NextResponse.json({ error: customersError.message }, { status: 500 });
  }

  const enriched = (customers || []).map((customer) => {
    const row = customer as {
      vehicles?: unknown[];
      jobs?: Array<{ archived_at?: string | null }>;
      invoices?: unknown[];
    };
    return {
      ...customer,
      vehicles: Array.isArray(row.vehicles) ? row.vehicles : [],
      jobs: Array.isArray(row.jobs)
        ? row.jobs.filter((job) => job.archived_at == null)
        : [],
      invoices: Array.isArray(row.invoices) ? row.invoices : [],
    };
  });

  return NextResponse.json({ customers: enriched, configured: true });
}
