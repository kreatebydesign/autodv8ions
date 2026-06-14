import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { JOB_STATUSES } from "@/lib/constants/jobs";
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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body.status !== undefined) {
    const status = String(body.status);
    if (!JOB_STATUSES.includes(status as (typeof JOB_STATUSES)[number])) {
      return NextResponse.json({ error: "Invalid job status" }, { status: 400 });
    }
    updates.status = status;
    updates.completed_at =
      status === "Completed" ? new Date().toISOString() : null;
  }

  if (body.internalNotes !== undefined) {
    updates.internal_notes =
      body.internalNotes === null ? null : String(body.internalNotes);
  }

  if (body.customerNotes !== undefined) {
    updates.customer_notes =
      body.customerNotes === null ? null : String(body.customerNotes);
  }

  if (body.scheduledAt !== undefined) {
    updates.scheduled_at = body.scheduledAt || null;
  }

  if (body.serviceType !== undefined) {
    updates.service_type = String(body.serviceType);
  }

  if (body.tintPercentage !== undefined) {
    updates.tint_percentage =
      body.tintPercentage === null ? null : String(body.tintPercentage);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data: job, error: updateError } = await supabase
    .from("jobs")
    .update(updates)
    .eq("id", id)
    .select("*, customers(*), vehicles(*)")
    .single();

  if (updateError) {
    console.error("[jobs][patch]", id, updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
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
