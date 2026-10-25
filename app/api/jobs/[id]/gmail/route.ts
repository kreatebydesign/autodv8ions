import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { mergeConversationMessages } from "@/lib/crm/conversation-merge";
import {
  buildLinkEmailMismatchWarning,
  buildParticipationWarning,
  shouldExposeGmailThreadMessages,
} from "@/lib/crm/job-gmail-conversation";
import { getPrimaryJobGmailThreadLink } from "@/lib/crm/job-gmail-thread";
import { listJobOutboundEmails } from "@/lib/crm/outbound-email";
import {
  GmailIntegrationError,
  getConversationForLinkedThread,
  isGoogleGmailConfigured,
  listThreadCandidatesForCustomerEmail,
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
  const resendOnly = mergeConversationMessages([], outbound);
  const resendSynthetic = syntheticThreadFromOutbound(resendOnly, customerEmail);

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
        threadCandidates: [],
        linkedThreadId: null,
        requiresLinkSelection: false,
        linkWarning: null,
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

  const primaryLink = await getPrimaryJobGmailThreadLink(id);

  try {
    if (primaryLink) {
      const linkWarning =
        buildLinkEmailMismatchWarning(primaryLink, customerEmail) ||
        null;

      let gmailThread = null as Awaited<
        ReturnType<typeof getConversationForLinkedThread>
      > | null;
      let participationWarning = null as ReturnType<
        typeof buildParticipationWarning
      > | null;

      try {
        gmailThread = await getConversationForLinkedThread({
          threadId: primaryLink.gmail_thread_id,
          customerEmail,
          markRead: true,
        });
        participationWarning = buildParticipationWarning(
          gmailThread.thread.messages,
          customerEmail,
        );
      } catch (err) {
        if (outbound.length > 0) {
          return noStoreJson({
            configured: true,
            customerEmail,
            mailboxEmail: null,
            candidateCount: 0,
            threadCandidates: [],
            linkedThreadId: primaryLink.gmail_thread_id,
            requiresLinkSelection: false,
            linkWarning,
            thread: resendSynthetic,
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
        throw err;
      }

      const combinedWarning = participationWarning || linkWarning;
      const exposeGmail = shouldExposeGmailThreadMessages(combinedWarning);

      const merged = exposeGmail
        ? mergeConversationMessages(gmailThread!.thread.messages, outbound)
        : resendOnly;

      const thread = exposeGmail
        ? {
            ...gmailThread!.thread,
            messages: merged,
          }
        : resendSynthetic;

      return noStoreJson({
        configured: true,
        customerEmail,
        mailboxEmail: gmailThread!.mailboxEmail,
        candidateCount: 0,
        threadCandidates: [],
        linkedThreadId: primaryLink.gmail_thread_id,
        requiresLinkSelection: false,
        linkWarning: combinedWarning,
        thread,
        outboundCount: outbound.length,
      });
    }

    const discovery = await listThreadCandidatesForCustomerEmail(customerEmail);
    const requiresLinkSelection = discovery.candidateCount > 0;

    const merged = mergeConversationMessages([], outbound);
    const thread = requiresLinkSelection
      ? resendSynthetic
      : syntheticThreadFromOutbound(merged, customerEmail);

    return noStoreJson({
      configured: true,
      customerEmail,
      mailboxEmail: discovery.mailboxEmail,
      candidateCount: discovery.candidateCount,
      threadCandidates: discovery.candidates,
      linkedThreadId: null,
      requiresLinkSelection,
      linkWarning: null,
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
        threadCandidates: [],
        linkedThreadId: primaryLink?.gmail_thread_id || null,
        requiresLinkSelection: false,
        linkWarning: null,
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
