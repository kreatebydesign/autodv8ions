import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import {
  GmailIntegrationError,
  getConversationForCustomerEmail,
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

function gmailErrorResponse(error: unknown) {
  if (error instanceof GmailIntegrationError) {
    console.error(`[jobs/gmail] ${error.code}`);
    return noStoreJson(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }

  console.error("[jobs/gmail] unexpected_error");
  return noStoreJson(
    { error: "Gmail API request failed.", code: "gmail_api_failed" },
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

export async function GET(_request: Request, context: RouteContext) {
  const { error } = await requireAdminSession();
  if (error) return error;

  if (!isGoogleGmailConfigured()) {
    return noStoreJson(
      {
        configured: false,
        customerEmail: null,
        thread: null,
        error: "Gmail is not configured.",
        code: "gmail_not_configured",
      },
      { status: 503 },
    );
  }

  const { id } = await context.params;
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
        configured: true,
        customerEmail: null,
        thread: null,
        error: "Customer has no email.",
        code: "customer_email_missing",
      },
      { status: 400 },
    );
  }

  try {
    const result = await getConversationForCustomerEmail({
      customerEmail,
      markRead: true,
    });

    return noStoreJson({
      configured: true,
      customerEmail,
      mailboxEmail: result.mailboxEmail,
      candidateCount: result.candidateCount,
      thread: result.thread,
    });
  } catch (err) {
    return gmailErrorResponse(err);
  }
}
