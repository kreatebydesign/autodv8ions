import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type TintQuoteBody = Record<string, unknown>;

type JobCreationResult = {
  ok: boolean;
  jobId?: string;
  customerId?: string;
  vehicleId?: string;
  error?: string;
  details?: unknown;
};

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

function asString(value: unknown) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function asNullableString(value: unknown) {
  const text = asString(value);
  return text || null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function hasVehicleData(body: TintQuoteBody) {
  return Boolean(
    asString(body.year) || asString(body.make) || asString(body.model),
  );
}

function buildCustomerNotes(body: TintQuoteBody) {
  return [
    body.tintScope ? `Tint scope: ${body.tintScope}` : null,
    body.tintLevel ? `Tint level: ${body.tintLevel}` : null,
    body.mainPriority ? `Priority: ${body.mainPriority}` : null,
    body.timeline ? `Timeline: ${body.timeline}` : null,
    body.contactMethod ? `Contact via: ${body.contactMethod}` : null,
    body.contactTime ? `Contact time: ${body.contactTime}` : null,
    body.currentTint ? `Current tint: ${body.currentTint}` : null,
    body.needTintRemoval ? `Tint removal: ${body.needTintRemoval}` : null,
    body.tintNotes ? `Tint notes: ${body.tintNotes}` : null,
    body.vehicleNotes ? `Vehicle notes: ${body.vehicleNotes}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

async function findOrCreateCustomer(
  supabase: SupabaseClient,
  body: TintQuoteBody,
) {
  const firstName = asString(body.firstName);
  const lastName = asString(body.lastName);
  const phone = asNullableString(body.phone);
  const email = asNullableString(body.email);

  if (phone) {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("phone", phone)
      .maybeSingle();

    if (error) {
      return { customer: null, error };
    }
    if (data) {
      return { customer: data, error: null };
    }
  }

  if (email) {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      return { customer: null, error };
    }
    if (data) {
      return { customer: data, error: null };
    }
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({
      first_name: firstName,
      last_name: lastName,
      phone,
      email,
    })
    .select("*")
    .single();

  return { customer: data, error };
}

async function createVehicleForCustomer(
  supabase: SupabaseClient,
  customerId: string,
  body: TintQuoteBody,
) {
  const { data, error } = await supabase
    .from("vehicles")
    .insert({
      customer_id: customerId,
      year: asNullableString(body.year),
      make: asNullableString(body.make),
      model: asNullableString(body.model),
      color: asNullableString(body.vehicleColor),
      vehicle_type: asNullableString(body.vehicleType),
    })
    .select("*")
    .single();

  return { vehicle: data, error };
}

async function createJobFromLead(
  supabase: SupabaseClient,
  body: TintQuoteBody,
  leadId: string,
  customerId: string,
  vehicleId: string | null,
): Promise<JobCreationResult> {
  const leadRef = isUuid(leadId) ? leadId : null;

  if (!leadRef) {
    console.warn(
      "[tint-quote][job] Lead id is not a UUID; creating job without tint_quote_lead_id link:",
      leadId,
    );
  } else {
    const { data: existingJob, error: existingError } = await supabase
      .from("jobs")
      .select("id")
      .eq("tint_quote_lead_id", leadRef)
      .maybeSingle();

    if (existingError) {
      console.error(
        "[tint-quote][job] Existing job lookup failed:",
        existingError,
      );
    } else if (existingJob) {
      console.log(
        "[tint-quote][job] Job already exists for lead:",
        leadRef,
        existingJob.id,
      );
      return {
        ok: true,
        jobId: existingJob.id,
        customerId,
        vehicleId: vehicleId || undefined,
      };
    }
  }

  const jobPayload: Record<string, unknown> = {
    customer_id: customerId,
    vehicle_id: vehicleId,
    service_type: "Window Tint",
    status: "New",
    tint_percentage: asNullableString(body.tintLevel) || asNullableString(body.tintScope),
    customer_notes: buildCustomerNotes(body) || null,
    source: "website_quote",
  };

  if (leadRef) {
    jobPayload.tint_quote_lead_id = leadRef;
  }

  const { data: job, error } = await supabase
    .from("jobs")
    .insert(jobPayload)
    .select("id")
    .single();

  if (error || !job) {
    return {
      ok: false,
      error: error?.message || "Job insert failed",
      details: error,
    };
  }

  return {
    ok: true,
    jobId: job.id,
    customerId,
    vehicleId: vehicleId || undefined,
  };
}

async function syncQuoteToJob(
  supabase: SupabaseClient,
  body: TintQuoteBody,
  leadId: string,
): Promise<JobCreationResult> {
  const { customer, error: customerError } = await findOrCreateCustomer(
    supabase,
    body,
  );

  if (customerError || !customer) {
    console.error("[tint-quote][job] Customer create/find failed:", customerError);
    return {
      ok: false,
      error: customerError?.message || "Customer create/find failed",
      details: customerError,
    };
  }

  let vehicleId: string | null = null;

  if (hasVehicleData(body)) {
    const { vehicle, error: vehicleError } = await createVehicleForCustomer(
      supabase,
      customer.id,
      body,
    );

    if (vehicleError || !vehicle) {
      console.error("[tint-quote][job] Vehicle create failed:", vehicleError);
      return {
        ok: false,
        error: vehicleError?.message || "Vehicle create failed",
        details: vehicleError,
        customerId: customer.id,
      };
    }

    vehicleId = vehicle.id;
  }

  return createJobFromLead(supabase, body, leadId, customer.id, vehicleId);
}

export async function POST(request: NextRequest) {
  let jobResult: JobCreationResult | null = null;

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
          service: asNullableString(body.tintScope) || asNullableString(body.service) || "Window Tint",
          preferred_date: asNullableString(body.timeline) || asNullableString(body.preferredDate),
          message: asNullableString(body.tintNotes) || asNullableString(body.message),
          source: "autodv8ions.com",
          raw_submission: body,
        })
        .select("id")
        .single();

      if (dbError) {
        console.error("[tint-quote] tint_quote_leads insert failed:", dbError);
      } else if (lead?.id) {
        leadId = String(lead.id);
        console.log("[tint-quote] Lead created:", leadId);

        jobResult = await syncQuoteToJob(supabase, body, leadId);

        if (jobResult.ok) {
          console.log("[tint-quote][job] Job created:", jobResult.jobId);
        } else {
          console.error("[tint-quote][job] Job creation failed:", jobResult);
        }
      }
    } else {
      console.warn(
        "[tint-quote] Supabase not configured. Skipping database save.",
      );
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

    return NextResponse.json(
      { success: false, error: "Something went wrong." },
      { status: 500 },
    );
  }
}
