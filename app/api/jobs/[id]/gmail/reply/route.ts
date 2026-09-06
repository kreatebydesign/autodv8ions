import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import {
  GmailIntegrationError,
  isGoogleGmailConfigured,
  sendGmailReply,
} from "@/lib/google/gmail";
import { GMAIL_REPLY_BODY_MAX } from "@/lib/google/gmail-message";
import { getSupabaseAdmin } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

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
  const { error } = await requireAdminSession();
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

  let body: { threadId?: string; body?: string };
  try {
    body = await request.json();
  } catch {
    return noStoreJson({ error: "Invalid JSON body." }, { status: 400 });
  }

  const threadId = String(body.threadId || "").trim();
  const replyBody = String(body.body || "").trim();

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

  try {
    const result = await sendGmailReply({
      threadId,
      customerEmail,
      body: replyBody,
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
