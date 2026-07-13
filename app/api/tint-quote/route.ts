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
    debugLog("customer lookup by phone starting", { phone });
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("phone", phone)
      .maybeSingle();

    if (error) {
      debugLog("customer lookup by phone error", error);
      return { customer: null, error };
    }

    debugLog("customer lookup by phone result", {
      found: Boolean(data),
      customerId: data?.id ?? null,
    });

    if (data) {
      return { customer: data, error: null };
    }
  } else {
    debugLog("customer lookup by phone skipped (no phone provided)");
  }

  if (email) {
    debugLog("customer lookup by email starting", { email });
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      debugLog("customer lookup by email error", error);
      return { customer: null, error };
    }

    debugLog("customer lookup by email result", {
      found: Boolean(data),
      customerId: data?.id ?? null,
    });

    if (data) {
      return { customer: data, error: null };
    }
  } else {
    debugLog("customer lookup by email skipped (no email provided)");
  }

  const customerInsertPayload = {
    first_name: firstName,
    last_name: lastName,
    phone,
    email,
  };

  debugLog("customer insert payload", customerInsertPayload);

  const { data, error } = await supabase
    .from("customers")
    .insert(customerInsertPayload)
    .select("*")
    .single();

  if (error) {
    debugLog("customer insert error", error);
    return { customer: null, error };
  }

  debugLog("customer insert result", {
    customerId: data?.id ?? null,
    customer: data,
  });

  return { customer: data, error };
}

async function createVehicleForCustomer(
  supabase: SupabaseClient,
  customerId: string,
  body: TintQuoteBody,
) {
  const vehicleInsertPayload = {
    customer_id: customerId,
    year: asNullableString(body.year),
    make: asNullableString(body.make),
    model: asNullableString(body.model),
    color: asNullableString(body.vehicleColor),
    vehicle_type: asNullableString(body.vehicleType),
  };

  debugLog("vehicle insert payload", vehicleInsertPayload);

  const { data, error } = await supabase
    .from("vehicles")
    .insert(vehicleInsertPayload)
    .select("*")
    .single();

  if (error) {
    debugLog("vehicle insert error", error);
    return { vehicle: null, error };
  }

  debugLog("vehicle insert result", {
    vehicleId: data?.id ?? null,
    vehicle: data,
  });

  return { vehicle: data, error: null };
}

async function createJobFromLead(
  supabase: SupabaseClient,
  body: TintQuoteBody,
  leadId: string,
  customerId: string,
  vehicleId: string | null,
): Promise<JobCreationResult> {
  const leadRefString = String(leadId);
  const leadUuid = isUuid(leadRefString) ? leadRefString : null;

  debugLog("lead id reference check", {
    leadId,
    typeofLeadId: typeof leadId,
    leadRefString,
    leadUuid,
    isUuid: Boolean(leadUuid),
  });

  debugLog("job duplicate check starting", {
    tint_quote_lead_ref: leadRefString,
  });

  const { data: existingJob, error: existingError } = await supabase
    .from("jobs")
    .select("id")
    .eq("tint_quote_lead_ref", leadRefString)
    .maybeSingle();

  if (existingError) {
    debugLog("job duplicate check error", existingError);
    console.error(
      "[tint-quote][job] Existing job lookup failed:",
      existingError,
    );
  } else {
    debugLog("job duplicate check result", {
      duplicateFound: Boolean(existingJob),
      existingJobId: existingJob?.id ?? null,
    });
  }

  if (existingJob) {
    debugLog("job duplicate found, skipping insert", {
      existingJobId: existingJob.id,
      tint_quote_lead_ref: leadRefString,
    });
    return {
      ok: true,
      jobId: existingJob.id,
      customerId,
      vehicleId: vehicleId || undefined,
    };
  }

  const jobPayload: Record<string, unknown> = {
    customer_id: customerId,
    vehicle_id: vehicleId,
    service_type: "Window Tint",
    status: "New",
    tint_percentage:
      asNullableString(body.tintLevel) || asNullableString(body.tintScope),
    customer_notes: buildCustomerNotes(body) || null,
    source: "website_quote",
    tint_quote_lead_id: leadUuid,
    tint_quote_lead_ref: leadRefString,
  };

  debugLog("job insert payload", jobPayload);

  const { data: job, error } = await supabase
    .from("jobs")
    .insert(jobPayload)
    .select("id")
    .single();

  if (error) {
    debugLog("job insert error", error);
    return {
      ok: false,
      error: error.message || "Job insert failed",
      details: error,
    };
  }

  debugLog("job insert result", {
    jobId: job?.id ?? null,
    job,
  });

  if (!job) {
    debugLog("job insert error", {
      message: "Insert returned no row",
      job,
    });
    return {
      ok: false,
      error: "Job insert failed",
      details: { message: "Insert returned no row" },
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
  debugLog("syncQuoteToJob starting", {
    leadId,
    typeofLeadId: typeof leadId,
    hasVehicleData: hasVehicleData(body),
  });

  const { customer, error: customerError } = await findOrCreateCustomer(
    supabase,
    body,
  );

  if (customerError || !customer) {
    debugLog("syncQuoteToJob stopped at customer step", {
      customerError,
      customer,
    });
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
      debugLog("syncQuoteToJob stopped at vehicle step", {
        vehicleError,
        vehicle,
        customerId: customer.id,
      });
      console.error("[tint-quote][job] Vehicle create failed:", vehicleError);
      return {
        ok: false,
        error: vehicleError?.message || "Vehicle create failed",
        details: vehicleError,
        customerId: customer.id,
      };
    }

    vehicleId = vehicle.id;
  } else {
    debugLog("vehicle insert skipped (no vehicle data in submission)");
  }

  const jobResult = await createJobFromLead(
    supabase,
    body,
    leadId,
    customer.id,
    vehicleId,
  );

  debugLog("syncQuoteToJob finished", jobResult);
  return jobResult;
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
            "autodv8ions.com",
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

        jobResult = await syncQuoteToJob(supabase, body, leadId);

        if (jobResult.ok) {
          debugLog("job sync success", {
            jobId: jobResult.jobId,
            customerId: jobResult.customerId,
            vehicleId: jobResult.vehicleId ?? null,
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
