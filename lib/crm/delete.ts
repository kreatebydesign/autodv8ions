import type { SupabaseClient } from "@supabase/supabase-js";

export type DeleteJobResult =
  | {
      ok: true;
      jobId: string;
      customerId: string | null;
      invoicesDeleted: number;
      googleCalendarEventId: string | null;
      hadAppointment: boolean;
    }
  | { ok: false; error: "not_found" | "rpc_failed"; details?: unknown };

export type ArchiveCustomerResult =
  | {
      ok: true;
      customerId: string;
      alreadyArchived?: boolean;
      jobsArchived: number;
      jobCount: number;
      appointmentCount: number;
      invoiceCount: number;
      vehicleCount: number;
      archivedAt?: string;
    }
  | { ok: false; error: "not_found" | "rpc_failed"; details?: unknown };

export async function deleteJobTransactional(
  supabase: SupabaseClient,
  jobId: string,
): Promise<DeleteJobResult> {
  const { data, error } = await supabase.rpc("admin_delete_job", {
    p_job_id: jobId,
  });

  if (error) {
    return { ok: false, error: "rpc_failed", details: error };
  }

  const payload = (data || {}) as Record<string, unknown>;
  if (!payload.ok) {
    if (payload.error === "not_found") {
      return { ok: false, error: "not_found" };
    }
    return { ok: false, error: "rpc_failed", details: payload };
  }

  return {
    ok: true,
    jobId: String(payload.job_id || jobId),
    customerId: payload.customer_id ? String(payload.customer_id) : null,
    invoicesDeleted: Number(payload.invoices_deleted || 0),
    googleCalendarEventId: payload.google_calendar_event_id
      ? String(payload.google_calendar_event_id)
      : null,
    hadAppointment: Boolean(payload.had_appointment),
  };
}

export async function archiveCustomerTransactional(
  supabase: SupabaseClient,
  customerId: string,
): Promise<ArchiveCustomerResult> {
  const { data, error } = await supabase.rpc("admin_archive_customer", {
    p_customer_id: customerId,
  });

  if (error) {
    return { ok: false, error: "rpc_failed", details: error };
  }

  const payload = (data || {}) as Record<string, unknown>;
  if (!payload.ok) {
    if (payload.error === "not_found") {
      return { ok: false, error: "not_found" };
    }
    return { ok: false, error: "rpc_failed", details: payload };
  }

  return {
    ok: true,
    customerId: String(payload.customer_id || customerId),
    alreadyArchived: Boolean(payload.already_archived),
    jobsArchived: Number(payload.jobs_archived || 0),
    jobCount: Number(payload.job_count || 0),
    appointmentCount: Number(payload.appointment_count || 0),
    invoiceCount: Number(payload.invoice_count || 0),
    vehicleCount: Number(payload.vehicle_count || 0),
    archivedAt: payload.archived_at ? String(payload.archived_at) : undefined,
  };
}

export async function getCustomerDeletionPreview(
  supabase: SupabaseClient,
  customerId: string,
) {
  const [
    { count: jobCount },
    { count: appointmentCount },
    { count: invoiceCount },
    { count: vehicleCount },
    { data: customer },
  ] = await Promise.all([
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId)
      .is("archived_at", null),
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId)
      .is("archived_at", null)
      .or("google_calendar_event_id.not.is.null,scheduled_at.not.is.null"),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId),
    supabase
      .from("vehicles")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId),
    supabase
      .from("customers")
      .select("id, first_name, last_name, archived_at")
      .eq("id", customerId)
      .maybeSingle(),
  ]);

  if (!customer) return null;

  return {
    customer,
    jobCount: jobCount || 0,
    appointmentCount: appointmentCount || 0,
    invoiceCount: invoiceCount || 0,
    vehicleCount: vehicleCount || 0,
  };
}
