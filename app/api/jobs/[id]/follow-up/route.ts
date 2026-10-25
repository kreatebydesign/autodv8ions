import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import {
  addDaysFromNow,
  createFollowUpReminder,
  listFollowUpsForJob,
  updateFollowUpReminder,
} from "@/lib/crm/follow-up";
import { getSupabaseAdmin } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

async function assertJobExists(jobId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;
  const { data } = await supabase
    .from("jobs")
    .select("id")
    .eq("id", jobId)
    .is("archived_at", null)
    .maybeSingle();
  return Boolean(data);
}

function presetDueAt(preset: string): string | null {
  switch (preset) {
    case "tomorrow":
      return addDaysFromNow(1).toISOString();
    case "3days":
      return addDaysFromNow(3).toISOString();
    case "1week":
      return addDaysFromNow(7).toISOString();
    default:
      return null;
  }
}

function parseLocalDatetime(value: string): string | null {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export async function GET(_request: Request, context: RouteContext) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await context.params;
  if (!(await assertJobExists(id))) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const reminders = await listFollowUpsForJob(id);
  return NextResponse.json({ reminders });
}

export async function POST(request: Request, context: RouteContext) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await context.params;
  if (!(await assertJobExists(id))) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const action = String(body.action || "");

  if (action === "create") {
    const dueFromPreset = body.preset
      ? presetDueAt(String(body.preset))
      : null;
    const dueFromCustom = body.dueAt
      ? parseLocalDatetime(String(body.dueAt))
      : null;
    const dueAt = dueFromCustom || dueFromPreset;
    if (!dueAt) {
      return NextResponse.json(
        { error: "Valid due date is required." },
        { status: 400 },
      );
    }

    const created = await createFollowUpReminder({
      jobId: id,
      dueAt,
      note: body.note ? String(body.note) : null,
    });

    if (!created) {
      return NextResponse.json(
        {
          error:
            "Could not create reminder. This job may already have a pending follow-up.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({ reminder: created });
  }

  const reminderId = String(body.reminderId || "");
  if (!reminderId) {
    return NextResponse.json({ error: "reminderId is required." }, { status: 400 });
  }

  if (action === "complete") {
    const updated = await updateFollowUpReminder(reminderId, id, {
      status: "completed",
    });
    if (!updated) {
      return NextResponse.json({ error: "Reminder not found." }, { status: 404 });
    }
    return NextResponse.json({ reminder: updated });
  }

  if (action === "cancel") {
    const updated = await updateFollowUpReminder(reminderId, id, {
      status: "cancelled",
    });
    if (!updated) {
      return NextResponse.json({ error: "Reminder not found." }, { status: 404 });
    }
    return NextResponse.json({ reminder: updated });
  }

  if (action === "reschedule") {
    const dueAt = body.dueAt
      ? parseLocalDatetime(String(body.dueAt))
      : null;
    if (!dueAt) {
      return NextResponse.json({ error: "Valid due date is required." }, { status: 400 });
    }
    const updated = await updateFollowUpReminder(reminderId, id, { dueAt });
    if (!updated) {
      return NextResponse.json({ error: "Reminder not found." }, { status: 404 });
    }
    return NextResponse.json({ reminder: updated });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
