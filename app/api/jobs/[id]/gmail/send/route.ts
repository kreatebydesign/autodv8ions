import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import {
  buildGmailSendFingerprint,
  isRecentDuplicateGmailSend,
} from "@/lib/crm/gmail-send-idempotency";
import {
  getPrimaryJobGmailThreadLink,
  linkJobGmailThread,
} from "@/lib/crm/job-gmail-thread";
import {
  GmailIntegrationError,
  isGoogleGmailConfigured,
  sendGmailNewMessage,
} from "@/lib/google/gmail";
import { assertAdminForGmailReply } from "@/lib/google/gmail-reply-access";
import { GMAIL_REPLY_BODY_MAX } from "@/lib/google/gmail-message";
import { getSupabaseAdmin } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

const recentSendCache = new Map<
  string,
  { fingerprint: string; sentAtMs: number; gmailMessageId: string; threadId: string }
>();

function noStoreJson(body: unknown, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
    },
  });
}

function customerEmailFromJob(job: {
  customers?:
    | { email?: string | null }
    | Array<{ email?: string | null }>
    | null;
}): string {
  const customer = Array.isArray(job.customers)
    ? job.customers[0]
    : job.customers;
  return String(customer?.email || "")
    .trim()
    .toLowerCase();
}

export async function POST(request: Request, context: RouteContext) {
  const { email: adminEmail, error } = await requireAdminSession();
  const adminGate = assertAdminForGmailReply(adminEmail);
  if (!adminGate.ok) {
    return noStoreJson(adminGate.response.body, {
      status: adminGate.response.status,
    });
  }
  if (error) return error;

  if (!isGoogleGmailConfigured()) {
    return noStoreJson(
      { error: "Gmail is not configured.", code: "gmail_not_configured" },
      { status: 503 },
    );
  }

  const { id: jobId } = await context.params;

  let body: { subject?: string; message?: string; body?: string };
  try {
    body = await request.json();
  } catch {
    return noStoreJson({ error: "Invalid JSON body." }, { status: 400 });
  }

  const subject = String(body.subject || "").trim();
  const messageBody = String(body.message || body.body || "").trim();

  if (!subject) {
    return noStoreJson(
      { error: "Subject is required.", code: "gmail_subject_missing" },
      { status: 400 },
    );
  }
  if (!messageBody) {
    return noStoreJson(
      { error: "Message body is required.", code: "gmail_reply_empty" },
      { status: 400 },
    );
  }
  if (messageBody.length > GMAIL_REPLY_BODY_MAX) {
    return noStoreJson(
      { error: "Message is too long.", code: "gmail_reply_too_long" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return noStoreJson({ error: "Database not configured." }, { status: 500 });
  }

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, customers(email)")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    return noStoreJson({ error: "Job not found." }, { status: 404 });
  }

  const customerEmail = customerEmailFromJob(job);
  if (!customerEmail.includes("@")) {
    return noStoreJson(
      { error: "Customer has no email.", code: "customer_email_missing" },
      { status: 400 },
    );
  }

  const existingLink = await getPrimaryJobGmailThreadLink(jobId);
  if (existingLink) {
    return noStoreJson(
      {
        error:
          "This job already has a linked Gmail conversation. Reply in the thread instead.",
        code: "gmail_thread_already_linked",
      },
      { status: 409 },
    );
  }

  const fingerprint = buildGmailSendFingerprint({
    jobId,
    threadId: null,
    subject,
    body: messageBody,
  });
  const cached = recentSendCache.get(jobId);
  if (
    isRecentDuplicateGmailSend({
      fingerprint,
      lastFingerprint: cached?.fingerprint ?? null,
      lastSentAtMs: cached?.sentAtMs ?? null,
    })
  ) {
    return noStoreJson({
      success: true,
      duplicatePrevented: true,
      gmailMessageId: cached!.gmailMessageId,
      threadId: cached!.threadId,
    });
  }

  try {
    const sent = await sendGmailNewMessage({
      customerEmail,
      subject,
      body: messageBody,
    });

    const linkResult = await linkJobGmailThread({
      jobId,
      gmailThreadId: sent.threadId,
      customerEmail,
      linkSource: "auto_single",
      linkedByAdmin: adminEmail,
    });

    if (!linkResult.ok) {
      console.error("[jobs/gmail/send] link_after_send_failed", linkResult.code);
      return noStoreJson(
        {
          success: true,
          delivered: true,
          linked: false,
          warning:
            "Message sent via Gmail, but this job could not be linked automatically. Link the conversation manually.",
          gmailMessageId: sent.gmailMessageId,
          threadId: sent.threadId,
          code: linkResult.code,
        },
        { status: 202 },
      );
    }

    recentSendCache.set(jobId, {
      fingerprint,
      sentAtMs: Date.now(),
      gmailMessageId: sent.gmailMessageId,
      threadId: sent.threadId,
    });

    console.info("[jobs/gmail/send] sent", {
      jobId,
      threadId: sent.threadId,
      gmailMessageId: sent.gmailMessageId,
      admin: adminEmail,
    });

    return noStoreJson({
      success: true,
      delivered: true,
      linked: true,
      gmailMessageId: sent.gmailMessageId,
      threadId: sent.threadId,
      link: linkResult.link,
    });
  } catch (err) {
    if (err instanceof GmailIntegrationError) {
      return noStoreJson(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return noStoreJson(
      { error: "Message could not be sent.", code: "gmail_reply_failed" },
      { status: 502 },
    );
  }
}
