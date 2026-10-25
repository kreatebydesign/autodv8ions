import { normalizeEmailAddress } from "@/lib/google/gmail-message";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export type JobGmailLinkSource = "manual" | "auto_single" | "import_legacy";

export type JobGmailThreadLink = {
  id: string;
  job_id: string;
  gmail_thread_id: string;
  customer_email: string;
  is_primary: boolean;
  link_source: JobGmailLinkSource;
  linked_at: string;
  linked_by_admin: string | null;
  created_at: string;
  updated_at: string;
};

export type LinkJobGmailThreadResult =
  | { ok: true; link: JobGmailThreadLink }
  | { ok: false; code: string; message: string };

export async function getPrimaryJobGmailThreadLink(
  jobId: string,
): Promise<JobGmailThreadLink | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("job_gmail_threads")
    .select("*")
    .eq("job_id", jobId)
    .eq("is_primary", true)
    .maybeSingle();

  if (error) {
    console.error("[crm/job-gmail-thread] primary_load_error", error.code);
    return null;
  }

  return (data as JobGmailThreadLink) || null;
}

export async function listPrimaryGmailThreadLinksForJobs(
  jobIds: string[],
): Promise<JobGmailThreadLink[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase || jobIds.length === 0) return [];

  const { data, error } = await supabase
    .from("job_gmail_threads")
    .select("*")
    .in("job_id", jobIds)
    .eq("is_primary", true);

  if (error) {
    console.error("[crm/job-gmail-thread] bulk_primary_load_error", error.code);
    return [];
  }

  return (data as JobGmailThreadLink[]) || [];
}

/** Map gmail_thread_id → primary job_id for notification routing. */
export async function loadThreadIdToJobIdMap(): Promise<Map<string, string>> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return new Map();

  const { data, error } = await supabase
    .from("job_gmail_threads")
    .select("job_id, gmail_thread_id")
    .eq("is_primary", true);

  if (error) {
    console.error("[crm/job-gmail-thread] thread_map_error", error.code);
    return new Map();
  }

  const map = new Map<string, string>();
  for (const row of data || []) {
    const threadId = String(row.gmail_thread_id || "").trim();
    const jobId = String(row.job_id || "").trim();
    if (threadId && jobId) map.set(threadId, jobId);
  }
  return map;
}

export async function linkJobGmailThread(params: {
  jobId: string;
  gmailThreadId: string;
  customerEmail: string;
  linkSource: JobGmailLinkSource;
  linkedByAdmin?: string | null;
}): Promise<LinkJobGmailThreadResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: false, code: "db_unavailable", message: "Database not configured." };
  }

  const jobId = params.jobId.trim();
  const gmailThreadId = params.gmailThreadId.trim();
  const customerEmail = normalizeEmailAddress(params.customerEmail);

  if (!jobId || !gmailThreadId) {
    return { ok: false, code: "invalid_input", message: "Job and thread are required." };
  }
  if (!customerEmail.includes("@")) {
    return { ok: false, code: "customer_email_invalid", message: "Invalid customer email." };
  }

  const { error: demoteError } = await supabase
    .from("job_gmail_threads")
    .update({ is_primary: false, updated_at: new Date().toISOString() })
    .eq("job_id", jobId)
    .eq("is_primary", true);

  if (demoteError) {
    console.error("[crm/job-gmail-thread] demote_error", demoteError.code);
    return { ok: false, code: "demote_failed", message: "Could not update thread link." };
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("job_gmail_threads")
    .upsert(
      {
        job_id: jobId,
        gmail_thread_id: gmailThreadId,
        customer_email: customerEmail,
        is_primary: true,
        link_source: params.linkSource,
        linked_at: now,
        linked_by_admin: params.linkedByAdmin || null,
        updated_at: now,
      },
      { onConflict: "job_id,gmail_thread_id" },
    )
    .select("*")
    .single();

  if (error || !data) {
    console.error("[crm/job-gmail-thread] link_error", error?.code);
    if (error?.code === "23505") {
      return {
        ok: false,
        code: "gmail_thread_already_linked",
        message:
          "This Gmail conversation is already linked to another job. Unlink it there first.",
      };
    }
    return { ok: false, code: "link_failed", message: "Could not link conversation." };
  }

  return { ok: true, link: data as JobGmailThreadLink };
}

export async function unlinkPrimaryJobGmailThread(
  jobId: string,
): Promise<{ ok: boolean; code?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, code: "db_unavailable" };

  const { error } = await supabase
    .from("job_gmail_threads")
    .delete()
    .eq("job_id", jobId)
    .eq("is_primary", true);

  if (error) {
    console.error("[crm/job-gmail-thread] unlink_error", error.code);
    return { ok: false, code: "unlink_failed" };
  }

  return { ok: true };
}
