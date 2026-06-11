import InvoicePrintView from "@/components/admin/InvoicePrintView";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { Invoice } from "@/lib/types/database";
import { notFound } from "next/navigation";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  if (!supabase) notFound();

  const { data } = await supabase
    .from("invoices")
    .select("*, customers(*)")
    .eq("id", id)
    .single();

  if (!data) notFound();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--dv8-muted)]">
          Billing
        </p>
        <h1 className="mt-2 text-3xl font-light tracking-tight">Invoice</h1>
      </div>
      <InvoicePrintView invoice={data as Invoice} />
    </div>
  );
}
