import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { JOB_STATUSES } from "@/lib/constants/jobs";
import {
  CalendarEventMissingError,
  createCalendarEventForJob,
  deleteCalendarEvent,
  updateCalendarEventForJob,
} from "@/lib/google/calendar";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { Job } from "@/lib/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

type RouteContext = { params: Promise<{ id: string }> };

async function loadJob(supabase: SupabaseClient, id: string) {
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("*, customers(*), vehicles(*)")
    .eq("id", id)
    .single();

  if (jobError || !job) return null;
  return job as Job;
}

function parseAppointmentNotes(
  body: Record<string, unknown>,
  fallback: string | null | undefined,
) {
  if (body.appointmentNotes === undefined) {
    return fallback ?? null;
  }
  if (body.appointmentNotes === null) return null;
  const trimmed = String(body.appointmentNotes).trim();
  return trimmed || null;
}

function getCalendarErrorMessage(calendarError: unknown) {
  if (calendarError instanceof CalendarEventMissingError) {
    return calendarError.message;
  }

  if (!calendarError || typeof calendarError !== "object") {
    return "Google Calendar request failed.";
  }

  const err = calendarError as {
    message?: string;
    errors?: Array<{ message?: string }>;
    response?: { data?: { error?: { message?: string } } };
  };

  const apiMessage =
    err.response?.data?.error?.message ||
    err.errors?.[0]?.message ||
    err.message;

  return typeof apiMessage === "string" && apiMessage.trim()
    ? apiMessage
    : "Google Calendar request failed.";
}

function calendarErrorResponse(calendarError: unknown) {
  if (calendarError instanceof CalendarEventMissingError) {
    return NextResponse.json(
      { error: calendarError.message, code: "calendar_event_missing" },
      { status: 404 },
    );
  }

  return NextResponse.json(
    { error: getCalendarErrorMessage(calendarError) },
    { status: 400 },
  );
}

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

  if (body.appointmentNotes !== undefined) {
    updates.appointment_notes =
      body.appointmentNotes === null
        ? null
        : String(body.appointmentNotes).trim() || null;
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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "";
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const job = await loadJob(supabase, id);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (action === "create-calendar-event") {
    const startDateTime =
      typeof body.startDateTime === "string" ? body.startDateTime.trim() : "";
    if (!startDateTime) {
      return NextResponse.json(
        { error: "Appointment date and time are required." },
        { status: 400 },
      );
    }

    if (job.google_calendar_event_id) {
      return NextResponse.json(
        {
          error: "This job already has a calendar appointment.",
          job,
        },
        { status: 409 },
      );
    }

    const appointmentNotes = parseAppointmentNotes(body, job.appointment_notes);

    // Persist notes first so a Calendar failure never loses operational notes.
    const { data: notesSavedJob, error: notesError } = await supabase
      .from("jobs")
      .update({ appointment_notes: appointmentNotes })
      .eq("id", id)
      .select("*, customers(*), vehicles(*)")
      .single();

    if (notesError || !notesSavedJob) {
      console.error("[jobs][calendar-create-notes]", id, notesError);
      return NextResponse.json(
        {
          error:
            notesError?.message ||
            "Could not save appointment notes before creating the Calendar event.",
        },
        { status: 500 },
      );
    }

    const jobForCalendar: Job = {
      ...(notesSavedJob as Job),
      appointment_notes: appointmentNotes,
    };

    let event: Awaited<ReturnType<typeof createCalendarEventForJob>>;
    try {
      event = await createCalendarEventForJob(jobForCalendar, startDateTime);
    } catch (calendarError) {
      console.error("[jobs][calendar-create]", id, calendarError);
      return NextResponse.json(
        {
          error: getCalendarErrorMessage(calendarError),
          job: notesSavedJob,
        },
        { status: 400 },
      );
    }

    const { data: updatedJob, error: updateError } = await supabase
      .from("jobs")
      .update({
        google_calendar_event_id: event.id,
        google_calendar_event_url: event.htmlLink,
        status:
          job.status === "New" || job.status === "Contacted"
            ? "Scheduled"
            : job.status,
        scheduled_at: event.start,
        appointment_notes: appointmentNotes,
      })
      .eq("id", id)
      .select("*, customers(*), vehicles(*)")
      .single();

    if (updateError || !updatedJob) {
      console.error("[jobs][calendar-create-link]", id, updateError);
      // Avoid orphaned Google events when job linkage fails.
      if (event.id) {
        try {
          await deleteCalendarEvent(event.id);
        } catch (cleanupError) {
          console.error("[jobs][calendar-create-cleanup]", id, cleanupError);
        }
      }
      return NextResponse.json(
        {
          error:
            updateError?.message ||
            "Google Calendar event could not be linked to this job. Please try scheduling again.",
          job: notesSavedJob,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ job: updatedJob, event });
  }

  if (action === "update-calendar-event") {
    const startDateTime =
      typeof body.startDateTime === "string" ? body.startDateTime.trim() : "";
    if (!startDateTime) {
      return NextResponse.json(
        { error: "Appointment date and time are required." },
        { status: 400 },
      );
    }

    if (!job.google_calendar_event_id) {
      return NextResponse.json(
        {
          error: "This job has no linked calendar appointment to reschedule.",
          job,
        },
        { status: 400 },
      );
    }

    const appointmentNotes = parseAppointmentNotes(body, job.appointment_notes);
    const jobForCalendar: Job = {
      ...job,
      appointment_notes: appointmentNotes,
    };

    try {
      const event = await updateCalendarEventForJob(
        jobForCalendar,
        job.google_calendar_event_id,
        startDateTime,
      );

      const { data: updatedJob, error: updateError } = await supabase
        .from("jobs")
        .update({
          // Preserve existing event identity / URL; refresh URL if Google returned one.
          google_calendar_event_id: job.google_calendar_event_id,
          google_calendar_event_url:
            event.htmlLink || job.google_calendar_event_url,
          scheduled_at: event.start,
          appointment_notes: appointmentNotes,
        })
        .eq("id", id)
        .select("*, customers(*), vehicles(*)")
        .single();

      if (updateError) {
        console.error("[jobs][calendar-update]", id, updateError);
        return NextResponse.json(
          {
            error:
              "Google Calendar was updated, but the job schedule could not be saved. Refresh and verify the appointment time.",
            event,
            job,
          },
          { status: 500 },
        );
      }

      return NextResponse.json({ job: updatedJob, event });
    } catch (calendarError) {
      // Google failed (including missing event) — do not mutate job fields.
      return calendarErrorResponse(calendarError);
    }
  }

  if (action === "cancel-calendar-event") {
    if (!job.google_calendar_event_id) {
      return NextResponse.json(
        {
          error: "This job has no linked calendar appointment to cancel.",
          job,
        },
        { status: 400 },
      );
    }

    const eventId = job.google_calendar_event_id;

    try {
      const result = await deleteCalendarEvent(eventId);

      // Keep appointment_notes on the job for reuse after cancel.
      // Only roll Scheduled → Contacted; leave any other manual status alone.
      const { data: updatedJob, error: updateError } = await supabase
        .from("jobs")
        .update({
          google_calendar_event_id: null,
          google_calendar_event_url: null,
          scheduled_at: null,
          ...(job.status === "Scheduled" ? { status: "Contacted" } : {}),
        })
        .eq("id", id)
        .select("*, customers(*), vehicles(*)")
        .single();

      if (updateError) {
        console.error("[jobs][calendar-cancel]", id, updateError);
        return NextResponse.json(
          {
            error:
              "The Google Calendar event was removed, but the job could not be cleared. Refresh and try again, or clear the appointment fields manually.",
            job,
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        job: updatedJob,
        alreadyMissing: result.alreadyMissing,
      });
    } catch (calendarError) {
      // Google delete failed for a non-404 reason — leave job fields unchanged.
      return calendarErrorResponse(calendarError);
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
