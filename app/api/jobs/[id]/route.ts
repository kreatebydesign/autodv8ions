import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { createCalendarEventForJob } from "@/lib/google/calendar";
import { getSupabaseAdmin } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.status !== undefined) {
    updates.status = body.status;
    if (body.status === "Completed") {
      updates.completed_at = new Date().toISOString();
    }
  }
  if (body.internalNotes !== undefined) updates.internal_notes = body.internalNotes;
  if (body.customerNotes !== undefined) updates.customer_notes = body.customerNotes;
  if (body.scheduledAt !== undefined) updates.scheduled_at = body.scheduledAt;
  if (body.serviceType !== undefined) updates.service_type = body.serviceType;
  if (body.tintPercentage !== undefined) updates.tint_percentage = body.tintPercentage;

  const { data: job, error: updateError } = await supabase
    .from("jobs")
    .update(updates)
    .eq("id", id)
    .select("*, customers(*), vehicles(*)")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ job });
}

export async function POST(request: Request, context: RouteContext) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await context.params;
  const body = await request.json();

  if (body.action !== "create-calendar-event") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("*, customers(*), vehicles(*)")
    .eq("id", id)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  try {
    const event = await createCalendarEventForJob(job, body.startDateTime);
    const { data: updatedJob } = await supabase
      .from("jobs")
      .update({
        google_calendar_event_id: event.id,
        google_calendar_event_url: event.htmlLink,
        status: job.status === "New" || job.status === "Contacted" ? "Scheduled" : job.status,
        scheduled_at: body.startDateTime || new Date(Date.now() + 86400000).toISOString(),
      })
      .eq("id", id)
      .select("*, customers(*), vehicles(*)")
      .single();

    return NextResponse.json({ job: updatedJob, event });
  } catch (calendarError) {
    const message =
      calendarError instanceof Error
        ? calendarError.message
        : "Google Calendar is not connected yet.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
