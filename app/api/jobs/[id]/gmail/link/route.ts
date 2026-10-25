import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import {
  linkJobGmailThread,
  unlinkPrimaryJobGmailThread,
} from "@/lib/crm/job-gmail-thread";
import {
  GmailIntegrationError,
  assertThreadBelongsToCustomer,
  isGoogleGmailConfigured,
} from "@/lib/google/gmail";
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
  if (error) return error;

  if (!isGoogleGmailConfigured()) {
    return noStoreJson(
      { error: "Gmail is not configured.", code: "gmail_not_configured" },
      { status: 503 },
    );
  }

  const { id: jobId } = await context.params;

  let body: { threadId?: string; linkSource?: string };
  try {
    body = await request.json();
  } catch {
    return noStoreJson({ error: "Invalid JSON body." }, { status: 400 });
  }

  const threadId = String(body.threadId || "").trim();
  if (!threadId) {
    return noStoreJson(
      { error: "Thread ID is required.", code: "gmail_thread_missing" },
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

  try {
    await assertThreadBelongsToCustomer(threadId, customerEmail);
  } catch (err) {
    if (err instanceof GmailIntegrationError) {
      return noStoreJson(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return noStoreJson(
      { error: "Thread could not be verified.", code: "gmail_api_failed" },
      { status: 502 },
    );
  }

  const linkSource =
    body.linkSource === "auto_single" ? "auto_single" : "manual";

  const result = await linkJobGmailThread({
    jobId,
    gmailThreadId: threadId,
    customerEmail,
    linkSource,
    linkedByAdmin: adminEmail,
  });

  if (!result.ok) {
    return noStoreJson(
      { error: result.message, code: result.code },
      { status: 400 },
    );
  }

  return noStoreJson({ success: true, link: result.link });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id: jobId } = await context.params;
  const result = await unlinkPrimaryJobGmailThread(jobId);

  if (!result.ok) {
    return noStoreJson(
      { error: "Could not unlink conversation.", code: result.code },
      { status: 500 },
    );
  }

  return noStoreJson({ success: true });
}
