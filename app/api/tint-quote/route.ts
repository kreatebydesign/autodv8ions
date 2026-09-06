import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import {
  asNullableString,
  buildTintCustomerNotes,
  syncWebsiteLeadToJob,
  type WebsiteJobCreationResult,
  type WebsiteLeadBody,
} from "@/lib/jobs/website-lead";

type TintQuoteBody = WebsiteLeadBody;

function debugLog(message: string, data?: unknown) {
  if (data === undefined) {
    console.log(`[tint-quote][job-debug] ${message}`);
    return;
  }
  console.log(`[tint-quote][job-debug] ${message}`, data);
}

function buildEmailHtml(body: TintQuoteBody) {
  const rows = Object.entries(body)
    .map(([key, value]) => {
      const cleanValue = Array.isArray(value)
        ? value.join(", ")
        : value || "Not provided";

      return `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #222;color:#888;text-transform:uppercase;font-size:11px;letter-spacing:1px;">${key}</td>
          <td style="padding:10px;border-bottom:1px solid #222;color:#fff;">${cleanValue}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div style="background:#050505;color:#fff;font-family:Arial,sans-serif;padding:32px;">
      <h1 style="margin:0 0 12px;font-size:26px;">New AutoDV8ions Tint Quote Request</h1>
      <p style="color:#aaa;margin:0 0 28px;">A new tint quote was submitted from the website.</p>
      <table style="width:100%;border-collapse:collapse;background:#0b0b0b;border:1px solid #222;">
        ${rows}
      </table>
    </div>
  `;
}

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
  let jobResult: WebsiteJobCreationResult | null = null;

  try {
    const body = (await request.json()) as TintQuoteBody;

    console.log("[tint-quote] Submission:", body);

    const supabase = getSupabaseClient();
    let leadId: string | undefined;

    if (supabase) {
      const customerName = [body.firstName, body.lastName]
        .filter(Boolean)
        .map((value) => String(value).trim())
        .join(" ")
        .trim();

      const { data: lead, error: dbError } = await supabase
        .from("tint_quote_leads")
        .insert({
          name: customerName || asNullableString(body.name),
          email: asNullableString(body.email),
          phone: asNullableString(body.phone),
          vehicle_year: asNullableString(body.year),
          vehicle_make: asNullableString(body.make),
          vehicle_model: asNullableString(body.model),
          service:
            asNullableString(body.tintScope) ||
            asNullableString(body.service) ||
            "Window Tint",
          preferred_date:
            asNullableString(body.timeline) ||
            asNullableString(body.preferredDate),
          message:
            asNullableString(body.tintNotes) || asNullableString(body.message),
          source:
            asNullableString(body.pageSource) ||
            asNullableString(body.source) ||
            "www.autodv8ions.com",
          raw_submission: body,
        })
        .select("id")
        .single();

      if (dbError) {
        console.error("[tint-quote] tint_quote_leads insert failed:", dbError);
        debugLog("tint_quote_leads insert error (job sync will not run)", dbError);
      } else if (lead?.id) {
        leadId = String(lead.id);
        debugLog("inserted tint_quote_leads id", {
          id: lead.id,
          typeofId: typeof lead.id,
          stringifiedId: leadId,
          typeofStringifiedId: typeof leadId,
        });

        jobResult = await syncWebsiteLeadToJob(supabase, {
          body,
          leadId,
          serviceType: "Window Tint",
          customerNotes: buildTintCustomerNotes(body) || null,
          source: "website_quote",
          tintPercentage:
            asNullableString(body.tintLevel) || asNullableString(body.tintScope),
        });

        if (jobResult.ok) {
          debugLog("job sync success", {
            jobId: jobResult.jobId,
            customerId: jobResult.customerId,
            vehicleId: jobResult.vehicleId ?? null,
            duplicate: Boolean(jobResult.duplicate),
          });
          console.log("[tint-quote][job] Job created:", jobResult.jobId);
        } else {
          debugLog("job sync failed", jobResult);
          console.error("[tint-quote][job] Job creation failed:", jobResult);
        }
      } else {
        debugLog("tint_quote_leads insert returned no id (job sync will not run)", {
          lead,
        });
      }
    } else {
      console.warn(
        "[tint-quote] Supabase not configured. Skipping database save.",
      );
      debugLog("supabase client unavailable (job sync skipped)");
    }

    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Email service is not configured." },
        { status: 500 },
      );
    }

    const resend = new Resend(apiKey);

    const { error } = await resend.emails.send({
      from: "AutoDV8ions <quotes@autodv8ions.com>",
      to: "sales@autodv8ions.com",
      subject: "New AutoDV8ions Tint Quote Request",
      html: buildEmailHtml(body),
      replyTo: asNullableString(body.email) || undefined,
    });

    if (error) {
      console.error("[tint-quote] Resend error:", error);

      return NextResponse.json(
        { success: false, error: "Email failed to send." },
        { status: 500 },
      );
    }

    const responseBody: Record<string, unknown> = { success: true };

    if (process.env.NODE_ENV === "development" && jobResult) {
      responseBody.jobSync = jobResult;
    }

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error("[tint-quote] API error:", error);
    debugLog("unhandled API error", error);

    return NextResponse.json(
      { success: false, error: "Something went wrong." },
      { status: 500 },
    );
  }
}
