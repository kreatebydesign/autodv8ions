import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

type InquiryBody = Record<string, unknown>;

const ALLOWED_TYPES = [
  "remote_starter",
  "vehicle_security",
  "audio_custom",
  "general_contact",
] as const;

type InquiryType = (typeof ALLOWED_TYPES)[number];

function asString(value: unknown) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function asNullableString(value: unknown) {
  const text = asString(value);
  return text || null;
}

function serviceLabel(type: InquiryType) {
  switch (type) {
    case "remote_starter":
      return "Remote Starter Consultation";
    case "vehicle_security":
      return "Vehicle Security Consultation";
    case "audio_custom":
      return "Audio / Custom Project Review";
    default:
      return "General Contact";
  }
}

function buildEmailHtml(body: InquiryBody, type: InquiryType) {
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
      <h1 style="margin:0 0 12px;font-size:26px;">New AutoDV8ions ${serviceLabel(type)}</h1>
      <p style="color:#aaa;margin:0 0 28px;">Submitted from the website. This is not a tint quote.</p>
      <table style="width:100%;border-collapse:collapse;background:#0b0b0b;border:1px solid #222;">
        ${rows}
      </table>
    </div>
  `;
}

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * General consultation / contact intake.
 * Reuses tint_quote_leads for storage (no schema change).
 * Does NOT create jobs — tint quotes remain on /api/tint-quote.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as InquiryBody;
    const type = asString(body.inquiryType) as InquiryType;

    if (!ALLOWED_TYPES.includes(type)) {
      return NextResponse.json(
        { success: false, error: "Invalid inquiry type." },
        { status: 400 },
      );
    }

    const firstName = asString(body.firstName);
    const lastName = asString(body.lastName);
    const phone = asString(body.phone);
    const email = asString(body.email);

    if (!firstName || !lastName || !phone) {
      return NextResponse.json(
        { success: false, error: "Name and phone are required." },
        { status: 400 },
      );
    }

    const customerName = `${firstName} ${lastName}`.trim();
    const pageSource =
      asNullableString(body.pageSource) ||
      asNullableString(body.source) ||
      "autodv8ions.com";

    const supabase = getSupabaseClient();
    if (supabase) {
      const messageParts = [
        asNullableString(body.message),
        asNullableString(body.projectGoals)
          ? `Goals: ${asString(body.projectGoals)}`
          : null,
        asNullableString(body.requestedUpgrade)
          ? `Requested upgrade: ${asString(body.requestedUpgrade)}`
          : null,
        asNullableString(body.timeline)
          ? `Timeline: ${asString(body.timeline)}`
          : null,
        asNullableString(body.budgetRange)
          ? `Budget range: ${asString(body.budgetRange)}`
          : null,
        type === "audio_custom"
          ? "Note: Project review submission does not guarantee acceptance."
          : null,
      ]
        .filter(Boolean)
        .join("\n");

      const { error: dbError } = await supabase.from("tint_quote_leads").insert({
        name: customerName,
        email: asNullableString(email),
        phone: asNullableString(phone),
        vehicle_year: asNullableString(body.year),
        vehicle_make: asNullableString(body.make),
        vehicle_model: asNullableString(body.model),
        service: serviceLabel(type),
        preferred_date: asNullableString(body.timeline),
        message: messageParts || null,
        source: pageSource,
        raw_submission: {
          ...body,
          inquiryType: type,
          pageSource,
        },
      });

      if (dbError) {
        console.error("[inquiry] lead insert failed:", dbError);
      }
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
      subject: `New AutoDV8ions ${serviceLabel(type)}`,
      html: buildEmailHtml(
        {
          ...body,
          inquiryType: type,
          pageSource,
        },
        type,
      ),
      replyTo: asNullableString(email) || undefined,
    });

    if (error) {
      console.error("[inquiry] Resend error:", error);
      return NextResponse.json(
        { success: false, error: "Email failed to send." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[inquiry] API error:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong." },
      { status: 500 },
    );
  }
}
