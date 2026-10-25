import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import {
  GmailIntegrationError,
  isGoogleGmailConfigured,
  sendGmailReply,
} from "@/lib/google/gmail";
import {
  buildGmailSendFingerprint,
  isRecentDuplicateGmailSend,
} from "@/lib/crm/gmail-send-idempotency";
import { validateReplyThreadForJob } from "@/lib/crm/job-gmail-reply-guard";
import { getPrimaryJobGmailThreadLink } from "@/lib/crm/job-gmail-thread";
import { assertAdminForGmailReply } from "@/lib/google/gmail-reply-access";
import { GMAIL_REPLY_BODY_MAX } from "@/lib/google/gmail-message";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  parseGmailOutboundAttachmentsFromFormData,
  readGmailMultipartFields,
} from "@/lib/crm/gmail-outbound-request";

type RouteContext = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

const recentReplyCache = new Map<
  string,
  { fingerprint: string; sentAtMs: number; gmailMessageId: string }
>();

function noStoreJson(body: unknown, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
    },
  });
}

function gmailErrorResponse(error: unknown) {
  if (error instanceof GmailIntegrationError) {
    console.error(`[jobs/gmail/reply] ${error.code}`);
    return noStoreJson(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }

  console.error("[jobs/gmail/reply] unexpected_error");
  return noStoreJson(
    { error: "Reply could not be sent.", code: "gmail_reply_failed" },
    { status: 502 },
  );
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
  const { email, error } = await requireAdminSession();
  const adminGate = assertAdminForGmailReply(email);
  if (!adminGate.ok) {
    return noStoreJson(adminGate.response.body, {
      status: adminGate.response.status,
    });
  }
  if (error) return error;

  if (!isGoogleGmailConfigured()) {
    return noStoreJson(
      {
        error: "Gmail is not configured.",
        code: "gmail_not_configured",
      },
      { status: 503 },
    );
  }

  const { id } = await context.params;

  const contentType = request.headers.get("content-type") || "";
  let threadId = "";
  let replyBody = "";
  let outboundAttachments: Awaited<
    ReturnType<typeof parseGmailOutboundAttachmentsFromFormData>
  > = { ok: true, attachments: [], attachmentHashes: [] };

  if (contentType.includes("multipart/form-data")) {
    const multipart = await readGmailMultipartFields(request);
    if (!multipart.ok) {
      return noStoreJson(
        { error: multipart.message, code: multipart.code },
        { status: 400 },
      );
    }
    threadId = String(multipart.formData.get("threadId") || "").trim();
    replyBody = String(multipart.formData.get("body") || "").trim();
    outboundAttachments = await parseGmailOutboundAttachmentsFromFormData(
      multipart.formData,
    );
  } else {
    let body: { threadId?: string; body?: string };
    try {
      body = await request.json();
    } catch {
      return noStoreJson({ error: "Invalid JSON body." }, { status: 400 });
    }
    threadId = String(body.threadId || "").trim();
    replyBody = String(body.body || "").trim();
  }

  if (!outboundAttachments.ok) {
    return noStoreJson(
      { error: outboundAttachments.message, code: outboundAttachments.code },
      { status: 400 },
    );
  }

  if (!threadId) {
    return noStoreJson(
      { error: "Thread ID is required.", code: "gmail_thread_missing" },
      { status: 400 },
    );
  }
  if (!replyBody) {
    return noStoreJson(
      { error: "Reply body is required.", code: "gmail_reply_empty" },
      { status: 400 },
    );
  }
  if (replyBody.length > GMAIL_REPLY_BODY_MAX) {
    return noStoreJson(
      { error: "Reply is too long.", code: "gmail_reply_too_long" },
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
    .eq("id", id)
    .single();

  if (jobError || !job) {
    return noStoreJson({ error: "Job not found." }, { status: 404 });
  }

  const customerEmail = customerEmailFromJob(job);
  if (!customerEmail || !customerEmail.includes("@")) {
    return noStoreJson(
      {
        error: "Customer has no email.",
        code: "customer_email_missing",
      },
      { status: 400 },
    );
  }

  const primaryLink = await getPrimaryJobGmailThreadLink(id);
  const threadGate = validateReplyThreadForJob({
    requestedThreadId: threadId,
    linkedThreadId: primaryLink?.gmail_thread_id || null,
  });
  if (!threadGate.ok) {
    return noStoreJson(
      { error: threadGate.message, code: threadGate.code },
      { status: 403 },
    );
  }

  const fingerprint = buildGmailSendFingerprint({
    jobId: id,
    threadId,
    subject: "",
    body: replyBody,
    attachmentHashes: outboundAttachments.attachmentHashes,
  });
  const cached = recentReplyCache.get(`${id}:${threadId}`);
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
      threadId,
    });
  }

  try {
    const result = await sendGmailReply({
      threadId,
      customerEmail,
      body: replyBody,
      attachments: outboundAttachments.attachments,
    });

    if (!result.gmailMessageId) {
      return noStoreJson(
        {
          error: "Gmail did not confirm the send.",
          code: "gmail_reply_failed",
        },
        { status: 502 },
      );
    }

    recentReplyCache.set(`${id}:${threadId}`, {
      fingerprint,
      sentAtMs: Date.now(),
      gmailMessageId: result.gmailMessageId,
    });

    console.info("[jobs/gmail/reply] sent", {
      jobId: id,
      threadId: result.threadId,
      gmailMessageId: result.gmailMessageId,
      admin: email,
    });

    return noStoreJson({
      success: true,
      gmailMessageId: result.gmailMessageId,
      threadId: result.threadId,
      message: result.message,
    });
  } catch (err) {
    return gmailErrorResponse(err);
  }
}
