import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  outboundContentFingerprint,
  type OutboundLogResult,
} from "@/lib/crm/resend-job-email";

export type JobOutboundEmail = {
  id: string;
  job_id: string;
  to_email: string;
  subject: string;
  body_text: string;
  provider: "resend";
  resend_message_id: string | null;
  content_fingerprint: string | null;
  sent_at: string;
};

/**
 * Short window to block accidental double-clicks / duplicate POSTs with identical
 * content. Legitimate follow-up emails with the same subject after this window are allowed.
 * Log-only recovery (Resend message id) never calls Resend again.
 */
export const OUTBOUND_DUPLICATE_SEND_WINDOW_MS = 3 * 60 * 1000;

export function isWithinDuplicateSendWindow(
  sentAtIso: string,
  nowMs = Date.now(),
): boolean {
  const sentMs = Date.parse(sentAtIso);
  if (Number.isNaN(sentMs)) return false;
  return nowMs - sentMs <= OUTBOUND_DUPLICATE_SEND_WINDOW_MS;
}

function mapInsertError(error: { code?: string; message?: string }): OutboundLogResult {
  const code = String(error.code || "insert_failed");
  if (code === "23505") {
    return {
      ok: false,
      code: "duplicate_resend_id",
      message: "Outbound record already exists for this Resend message.",
    };
  }
  return {
    ok: false,
    code,
    message: String(error.message || "Outbound log insert failed."),
  };
}

export async function findRecentDuplicateOutbound(params: {
  jobId: string;
  subject: string;
  bodyText: string;
}): Promise<JobOutboundEmail | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const fingerprint = outboundContentFingerprint(params.subject, params.bodyText);
  const since = new Date(Date.now() - OUTBOUND_DUPLICATE_SEND_WINDOW_MS).toISOString();

  const { data, error } = await supabase
    .from("job_outbound_emails")
    .select("*")
    .eq("job_id", params.jobId)
    .eq("content_fingerprint", fingerprint)
    .gte("sent_at", since)
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[crm/outbound-email] duplicate check error:", error.code);
    return null;
  }

  return (data as JobOutboundEmail) || null;
}

export async function findOutboundByResendMessageId(
  resendMessageId: string,
): Promise<JobOutboundEmail | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("job_outbound_emails")
    .select("*")
    .eq("resend_message_id", resendMessageId)
    .maybeSingle();

  if (error) {
    console.error("[crm/outbound-email] resend id lookup error:", error.code);
    return null;
  }

  return (data as JobOutboundEmail) || null;
}

export async function recordJobOutboundEmail(params: {
  jobId: string;
  toEmail: string;
  subject: string;
  bodyText: string;
  provider?: "resend";
  resendMessageId?: string | null;
}): Promise<OutboundLogResult & { row?: JobOutboundEmail }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: false, code: "database_unavailable", message: "Database not configured." };
  }

  const resendMessageId = params.resendMessageId?.trim() || null;
  const fingerprint = outboundContentFingerprint(params.subject, params.bodyText);

  if (resendMessageId) {
    const existing = await findOutboundByResendMessageId(resendMessageId);
    if (existing) {
      return { ok: true, id: existing.id, row: existing };
    }
  }

  const { data, error } = await supabase
    .from("job_outbound_emails")
    .insert({
      job_id: params.jobId,
      to_email: params.toEmail.trim().toLowerCase(),
      subject: params.subject.trim(),
      body_text: params.bodyText,
      provider: params.provider ?? "resend",
      resend_message_id: resendMessageId,
      content_fingerprint: fingerprint,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[crm/outbound-email] insert error:", error.code);
    return mapInsertError(error);
  }

  return { ok: true, id: String(data.id), row: data as JobOutboundEmail };
}

export async function listJobOutboundEmails(
  jobId: string,
): Promise<JobOutboundEmail[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("job_outbound_emails")
    .select("*")
    .eq("job_id", jobId)
    .order("sent_at", { ascending: true });

  if (error) {
    console.error("[crm/outbound-email] list error:", error.code);
    return [];
  }

  return (data || []) as JobOutboundEmail[];
}
