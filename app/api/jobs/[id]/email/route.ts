import { NextResponse } from "next/server";
import { Resend } from "resend";
import { requireAdminSession } from "@/lib/auth/require-admin";
import {
  findOutboundByResendMessageId,
  findRecentDuplicateOutbound,
  recordJobOutboundEmail,
} from "@/lib/crm/outbound-email";
import { classifyJobEmailSendOutcome } from "@/lib/crm/resend-job-email";
import { getSupabaseAdmin } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request: Request, context: RouteContext) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await context.params;

  let body: {
    to?: string;
    subject?: string;
    message?: string;
    resendMessageId?: string;
    logOnly?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const subject = String(body.subject || "").trim();
  const message = String(body.message || "").trim();
  const requestedTo = String(body.to || "").trim().toLowerCase();
  const resendMessageId = String(body.resendMessageId || "").trim();
  const logOnly = body.logOnly === true;

  if (!subject) {
    return NextResponse.json({ error: "Subject is required." }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }
  if (subject.length > 200) {
    return NextResponse.json({ error: "Subject is too long." }, { status: 400 });
  }
  if (message.length > 10000) {
    return NextResponse.json({ error: "Message is too long." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured." }, { status: 500 });
  }

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, customers(email, first_name, last_name)")
    .eq("id", id)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const customer = (Array.isArray(job.customers)
    ? job.customers[0]
    : job.customers) as
    | { email?: string | null; first_name?: string | null; last_name?: string | null }
    | null
    | undefined;
  const customerEmail = String(customer?.email || "")
    .trim()
    .toLowerCase();

  if (!customerEmail || !customerEmail.includes("@")) {
    return NextResponse.json(
      { error: "This customer has no valid email address." },
      { status: 400 },
    );
  }

  if (requestedTo && requestedTo !== customerEmail) {
    return NextResponse.json(
      { error: "Recipient must match the customer email on this job." },
      { status: 400 },
    );
  }

  const customerName = [customer?.first_name, customer?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  // Never resend after Resend already accepted the message — persist only.
  if (resendMessageId && !logOnly) {
    const existingByProviderId = await findOutboundByResendMessageId(resendMessageId);
    if (existingByProviderId) {
      if (existingByProviderId.job_id !== id) {
        return NextResponse.json(
          { error: "This send is already linked to another job." },
          { status: 409 },
        );
      }
      const payload = classifyJobEmailSendOutcome({
        sendFailed: false,
        resendMessageId,
        logResult: { ok: true, id: existingByProviderId.id },
        duplicatePrevented: true,
      });
      return NextResponse.json({
        ...payload,
        to: customerEmail,
        customerName: customerName || null,
      });
    }

    const logResult = await recordJobOutboundEmail({
      jobId: id,
      toEmail: customerEmail,
      subject,
      bodyText: message,
      resendMessageId,
    });

    const payload = classifyJobEmailSendOutcome({
      sendFailed: false,
      resendMessageId,
      logResult,
    });

    if (!logResult.ok) {
      console.error("[jobs/email] outbound_log_retry_failed", {
        jobId: id,
        code: logResult.code,
      });
      return NextResponse.json(
        { ...payload, error: "Could not save email to this job thread." },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ...payload,
      to: customerEmail,
      customerName: customerName || null,
    });
  }

  if (logOnly) {
    if (!resendMessageId) {
      return NextResponse.json(
        { error: "resendMessageId is required to save without resending." },
        { status: 400 },
      );
    }

    const existing = await findOutboundByResendMessageId(resendMessageId);
    if (existing && existing.job_id !== id) {
      return NextResponse.json(
        { error: "This send is already linked to another job." },
        { status: 409 },
      );
    }

    const logResult = await recordJobOutboundEmail({
      jobId: id,
      toEmail: customerEmail,
      subject,
      bodyText: message,
      resendMessageId,
    });

    const payload = classifyJobEmailSendOutcome({
      sendFailed: false,
      resendMessageId,
      logResult,
      duplicatePrevented: Boolean(existing),
    });

    if (!logResult.ok) {
      console.error("[jobs/email] outbound_log_retry_failed", {
        jobId: id,
        code: logResult.code,
      });
      return NextResponse.json(
        { ...payload, error: "Could not save email to this job thread." },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ...payload,
      to: customerEmail,
      customerName: customerName || null,
    });
  }

  const recentDuplicate = await findRecentDuplicateOutbound({
    jobId: id,
    subject,
    bodyText: message,
  });
  if (recentDuplicate) {
    const payload = classifyJobEmailSendOutcome({
      sendFailed: false,
      resendMessageId: recentDuplicate.resend_message_id,
      logResult: { ok: true, id: recentDuplicate.id },
      duplicatePrevented: true,
    });
    return NextResponse.json({
      ...payload,
      to: customerEmail,
      customerName: customerName || null,
    });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Email service is not configured." },
      { status: 500 },
    );
  }

  const resend = new Resend(apiKey);
  const { data: sendData, error: sendError } = await resend.emails.send({
    from: "AutoDV8ions Sales <sales@autodv8ions.com>",
    to: customerEmail,
    replyTo: "sales@autodv8ions.com",
    subject,
    text: message,
    html: `<div style="font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#111">
      <p style="margin:0 0 12px;white-space:pre-wrap">${escapeHtml(message).replace(/\n/g, "<br/>")}</p>
      <p style="margin:24px 0 0;font-size:13px;color:#666">AutoDV8ions Sales</p>
    </div>`,
  });

  if (sendError) {
    console.error("[jobs/email] resend_send_failed", { jobId: id });
    const payload = classifyJobEmailSendOutcome({
      sendFailed: true,
      sendErrorMessage: sendError.message || "Email failed to send.",
    });
    return NextResponse.json(payload, { status: 500 });
  }

  const providerMessageId = sendData?.id?.trim() || null;
  const logResult = await recordJobOutboundEmail({
    jobId: id,
    toEmail: customerEmail,
    subject,
    bodyText: message,
    resendMessageId: providerMessageId,
  });

  const payload = classifyJobEmailSendOutcome({
    sendFailed: false,
    resendMessageId: providerMessageId,
    logResult,
  });

  if (!logResult.ok) {
    console.error("[jobs/email] outbound_log_failed", {
      jobId: id,
      code: logResult.code,
      resendMessageId: providerMessageId ? "present" : "missing",
    });
  }

  const status = payload.logged === false ? 202 : 200;
  return NextResponse.json(
    {
      ...payload,
      to: customerEmail,
      customerName: customerName || null,
    },
    { status },
  );
}
