import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import {
  archiveCustomerTransactional,
  getCustomerDeletionPreview,
} from "@/lib/crm/delete";
import { getSupabaseAdmin } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Soft-delete (archive) a customer.
 * Hard delete is intentionally unsupported: FKs are ON DELETE SET NULL and
 * would orphan jobs/invoices/vehicles.
 */
export async function DELETE(_request: Request, context: RouteContext) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const { id } = await context.params;

  const preview = await getCustomerDeletionPreview(supabase, id);
  if (!preview) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const result = await archiveCustomerTransactional(supabase, id);
  if (!result.ok) {
    if (result.error === "not_found") {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    console.error("[customers][archive] rpc_failed", id);
    return NextResponse.json(
      { error: "Customer could not be archived. Try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    mode: "archive",
    customerId: result.customerId,
    alreadyArchived: Boolean(result.alreadyArchived),
    jobsArchived: result.jobsArchived,
    jobCount: result.jobCount,
    appointmentCount: result.appointmentCount,
    invoiceCount: result.invoiceCount,
    vehicleCount: result.vehicleCount,
    reason:
      "Customers are archived (soft-deleted) instead of hard-deleted because related jobs, invoices, and vehicles use ON DELETE SET NULL and must not be orphaned.",
  });
}

/** Optional preview for confirmation UIs. */
export async function GET(_request: Request, context: RouteContext) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const { id } = await context.params;
  const preview = await getCustomerDeletionPreview(supabase, id);
  if (!preview) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  return NextResponse.json({
    customer: preview.customer,
    jobCount: preview.jobCount,
    appointmentCount: preview.appointmentCount,
    invoiceCount: preview.invoiceCount,
    vehicleCount: preview.vehicleCount,
    deletionMode: "archive",
    reason:
      "Hard delete would orphan related records (SET NULL FKs). Archive hides the customer and cascade-archives active jobs while preserving invoices and vehicles.",
  });
}
