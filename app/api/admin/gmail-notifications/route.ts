import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import {
  GmailIntegrationError,
  isGoogleGmailConfigured,
  listUnreadCustomerReplyNotifications,
} from "@/lib/google/gmail";
import {
  buildEmailToJobMap,
  type JobEmailCandidate,
} from "@/lib/google/gmail-notifications";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { formatCustomerName } from "@/lib/utils/format";
import type { Customer } from "@/lib/types/database";

export const dynamic = "force-dynamic";

function noStoreJson(body: unknown, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
    },
  });
}

async function loadJobEmailCandidates(): Promise<JobEmailCandidate[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("jobs")
    .select("id, status, created_at, updated_at, customers(email, first_name, last_name)")
    .order("updated_at", { ascending: false })
    .limit(1000);

  if (error || !data) {
    console.error("[gmail-notifications] jobs_load_failed");
    return [];
  }

  const rows: JobEmailCandidate[] = [];
  for (const job of data) {
    const customer = (
      Array.isArray(job.customers) ? job.customers[0] : job.customers
    ) as Customer | null | undefined;
    const email = String(customer?.email || "").trim();
    if (!email.includes("@")) continue;

    rows.push({
      jobId: String(job.id),
      customerEmail: email,
      customerName: formatCustomerName(customer),
      status: String(job.status || ""),
      updatedAt: String(job.updated_at || ""),
      createdAt: String(job.created_at || ""),
    });
  }
  return rows;
}

export async function GET() {
  const { error } = await requireAdminSession();
  if (error) return error;

  if (!isGoogleGmailConfigured()) {
    return noStoreJson({
      configured: false,
      count: 0,
      items: [],
      code: "gmail_not_configured",
    });
  }

  try {
    const candidates = await loadJobEmailCandidates();
    const emailToJob = buildEmailToJobMap(candidates);
    const payload = await listUnreadCustomerReplyNotifications({ emailToJob });
    return noStoreJson(payload);
  } catch (err) {
    if (err instanceof GmailIntegrationError) {
      console.error(`[gmail-notifications] ${err.code}`);
      return noStoreJson(
        {
          configured: true,
          count: 0,
          items: [],
          error: err.message,
          code: err.code,
        },
        { status: err.status },
      );
    }

    console.error("[gmail-notifications] unexpected_error");
    return noStoreJson(
      {
        configured: true,
        count: 0,
        items: [],
        error: "Could not load customer reply notifications.",
        code: "gmail_api_failed",
      },
      { status: 502 },
    );
  }
}
