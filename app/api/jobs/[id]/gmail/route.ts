import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { mergeConversationMessages } from "@/lib/crm/conversation-merge";
import { listJobOutboundEmails } from "@/lib/crm/outbound-email";
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

function syntheticThreadFromOutbound(
  messages: ReturnType<typeof mergeConversationMessages>,
  customerEmail: string,
) {
  if (messages.length === 0) return null;
  const subject =
    messages.find((m) => m.subject?.trim())?.subject?.trim() || "(no subject)";
  return {
    id: `local-${customerEmail}`,
    subject,
    unread: false,
    messages,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const { error } = await requireAdminSession();
  if (error) return error;

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
  const outbound = await listJobOutboundEmails(id);

  if (!customerEmail || !customerEmail.includes("@")) {
    return noStoreJson(
      {
        configured: isGoogleGmailConfigured(),
        customerEmail: null,
        thread: syntheticThreadFromOutbound(
          mergeConversationMessages([], outbound),
          "",
        ),
        outboundCount: outbound.length,
        error: "Customer has no email.",
        code: "customer_email_missing",
      },
      { status: 400 },
    );
  }

  if (!isGoogleGmailConfigured()) {
    const localOnly = mergeConversationMessages([], outbound);
    return noStoreJson(
      {
        configured: false,
        customerEmail,
        mailboxEmail: null,
        candidateCount: 0,
        thread: syntheticThreadFromOutbound(localOnly, customerEmail),
        outboundCount: outbound.length,
        error: localOnly.length
          ? undefined
          : "Gmail is not configured.",
        code: localOnly.length ? undefined : "gmail_not_configured",
      },
      localOnly.length ? { status: 200 } : { status: 503 },
    );
  }

  try {
    const result = await getConversationForCustomerEmail({
      customerEmail,
      markRead: true,
    });

    const merged = mergeConversationMessages(
      result.thread?.messages || [],
      outbound,
    );

    const thread = result.thread
      ? {
          ...result.thread,
          messages: merged,
        }
      : syntheticThreadFromOutbound(merged, customerEmail);

    return noStoreJson({
      configured: true,
      customerEmail,
      mailboxEmail: result.mailboxEmail,
      candidateCount: result.candidateCount,
      thread,
      outboundCount: outbound.length,
    });
  } catch (err) {
    if (outbound.length > 0) {
      const merged = mergeConversationMessages([], outbound);
      return noStoreJson({
        configured: true,
        customerEmail,
        mailboxEmail: null,
        candidateCount: 0,
        thread: syntheticThreadFromOutbound(merged, customerEmail),
        outboundCount: outbound.length,
        error:
          err instanceof GmailIntegrationError
            ? err.message
            : "Gmail API request failed.",
        code:
          err instanceof GmailIntegrationError
            ? err.code
            : "gmail_api_failed",
      });
    }
    return gmailErrorResponse(err);
  }
}
