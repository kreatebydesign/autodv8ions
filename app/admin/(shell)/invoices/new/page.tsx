import InvoiceForm from "@/components/admin/InvoiceForm";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { formatCustomerName, formatVehicle } from "@/lib/utils/format";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string }>;
}) {
  const { jobId } = await searchParams;
  const supabase = getSupabaseAdmin();
  let customerId = "";
  let vehicleSummary = "";

  if (supabase && jobId) {
    const { data: job } = await supabase
      .from("jobs")
      .select("*, customers(*), vehicles(*)")
      .eq("id", jobId)
      .single();

    if (job) {
      customerId = job.customer_id || "";
      vehicleSummary = `${formatCustomerName(job.customers)} · ${formatVehicle(job.vehicles)}`;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--dv8-muted)]">
          Billing
        </p>
        <h1 className="mt-2 text-3xl font-light tracking-tight">New Invoice</h1>
      </div>
      <InvoiceForm jobId={jobId} customerId={customerId} vehicleSummary={vehicleSummary} />
    </div>
  );
}
