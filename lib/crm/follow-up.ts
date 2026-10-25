import { getSupabaseAdmin } from "@/lib/supabase/server";

export type FollowUpStatus = "pending" | "completed" | "cancelled";

export type JobFollowUpReminder = {
  id: string;
  job_id: string;
  due_at: string;
  status: FollowUpStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type FollowUpWithJob = JobFollowUpReminder & {
  jobs: {
    id: string;
    service_type: string | null;
    status: string | null;
    customers: {
      first_name: string | null;
      last_name: string | null;
    } | null;
    vehicles: {
      year: string | null;
      make: string | null;
      model: string | null;
    } | null;
  } | null;
};

export function addDaysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(9, 0, 0, 0);
  return d;
}

export async function createFollowUpReminder(params: {
  jobId: string;
  dueAt: string;
  note?: string | null;
}): Promise<JobFollowUpReminder | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const due = new Date(params.dueAt);
  if (Number.isNaN(due.getTime())) return null;

  const { data: existing } = await supabase
    .from("job_follow_up_reminders")
    .select("id")
    .eq("job_id", params.jobId)
    .eq("status", "pending")
    .limit(1);

  if (existing && existing.length > 0) {
    return null;
  }

  const { data, error } = await supabase
    .from("job_follow_up_reminders")
    .insert({
      job_id: params.jobId,
      due_at: due.toISOString(),
      note: params.note?.trim() || null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[crm/follow-up] create error:", error);
    return null;
  }

  return data as JobFollowUpReminder;
}

export async function listPendingFollowUpsForDashboard(
  limit = 20,
): Promise<FollowUpWithJob[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("job_follow_up_reminders")
    .select(
      "*, jobs(id, service_type, status, customers(first_name, last_name), vehicles(year, make, model))",
    )
    .eq("status", "pending")
    .order("due_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[crm/follow-up] list dashboard error:", error);
    return [];
  }

  return (data || []) as FollowUpWithJob[];
}

export async function listFollowUpsForJob(
  jobId: string,
): Promise<JobFollowUpReminder[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("job_follow_up_reminders")
    .select("*")
    .eq("job_id", jobId)
    .order("due_at", { ascending: false });

  if (error) {
    console.error("[crm/follow-up] list job error:", error);
    return [];
  }

  return (data || []) as JobFollowUpReminder[];
}

export async function updateFollowUpReminder(
  reminderId: string,
  jobId: string,
  patch: {
    status?: FollowUpStatus;
    dueAt?: string;
  },
): Promise<JobFollowUpReminder | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (patch.status) {
    updates.status = patch.status;
    if (patch.status === "completed") {
      updates.completed_at = new Date().toISOString();
    }
    if (patch.status === "pending") {
      updates.completed_at = null;
    }
  }

  if (patch.dueAt) {
    const due = new Date(patch.dueAt);
    if (Number.isNaN(due.getTime())) return null;
    updates.due_at = due.toISOString();
    updates.status = "pending";
    updates.completed_at = null;
  }

  const { data, error } = await supabase
    .from("job_follow_up_reminders")
    .update(updates)
    .eq("id", reminderId)
    .eq("job_id", jobId)
    .select("*")
    .single();

  if (error) {
    console.error("[crm/follow-up] update error:", error);
    return null;
  }

  return data as JobFollowUpReminder;
}
