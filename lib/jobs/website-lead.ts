import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServiceType } from "@/lib/constants/jobs";

export type WebsiteLeadBody = Record<string, unknown>;

export type WebsiteJobCreationResult = {
  ok: boolean;
  jobId?: string;
  customerId?: string;
  vehicleId?: string;
  error?: string;
  details?: unknown;
  duplicate?: boolean;
};

export type SyncWebsiteLeadInput = {
  body: WebsiteLeadBody;
  leadId: string;
  serviceType: ServiceType;
  customerNotes: string | null;
  source: string;
};

function asString(value: unknown) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

export function asNullableString(value: unknown) {
  const text = asString(value);
  return text || null;
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function hasVehicleData(body: WebsiteLeadBody) {
  return Boolean(
    asString(body.year) || asString(body.make) || asString(body.model),
  );
}

export function buildTintCustomerNotes(body: WebsiteLeadBody) {
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

export function buildInquiryCustomerNotes(
  body: WebsiteLeadBody,
  inquiryType: string,
) {
  return [
    inquiryType ? `Inquiry type: ${inquiryType}` : null,
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
    inquiryType === "audio_custom"
      ? "Note: Project review submission does not guarantee acceptance."
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function inquiryServiceType(
  inquiryType:
    | "remote_starter"
    | "vehicle_security"
    | "audio_custom"
    | "general_contact",
): ServiceType {
  switch (inquiryType) {
    case "remote_starter":
      return "Remote Starter";
    case "vehicle_security":
      return "Alarm / Security";
    case "audio_custom":
      return "Custom Mod";
    default:
      return "Other";
  }
}

export async function findOrCreateCustomer(
  supabase: SupabaseClient,
  body: WebsiteLeadBody,
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

    if (error) return { customer: null, error };
    if (data) return { customer: data, error: null };
  }

  if (email) {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error) return { customer: null, error };
    if (data) return { customer: data, error: null };
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

  if (error) return { customer: null, error };
  return { customer: data, error: null };
}

export async function createVehicleForCustomer(
  supabase: SupabaseClient,
  customerId: string,
  body: WebsiteLeadBody,
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

  if (error) return { vehicle: null, error };
  return { vehicle: data, error: null };
}

/**
 * Creates a job keyed by tint_quote_lead_ref so retries of the same lead
 * do not insert duplicates within the CRM.
 */
export async function createJobFromWebsiteLead(
  supabase: SupabaseClient,
  input: {
    body: WebsiteLeadBody;
    leadId: string;
    customerId: string;
    vehicleId: string | null;
    serviceType: ServiceType;
    customerNotes: string | null;
    source: string;
    tintPercentage?: string | null;
  },
): Promise<WebsiteJobCreationResult> {
  const leadRefString = String(input.leadId);
  const leadUuid = isUuid(leadRefString) ? leadRefString : null;

  const { data: existingJob, error: existingError } = await supabase
    .from("jobs")
    .select("id")
    .eq("tint_quote_lead_ref", leadRefString)
    .maybeSingle();

  if (existingError) {
    console.error(
      "[website-lead] Existing job lookup failed:",
      existingError,
    );
  }

  if (existingJob) {
    return {
      ok: true,
      jobId: existingJob.id,
      customerId: input.customerId,
      vehicleId: input.vehicleId || undefined,
      duplicate: true,
    };
  }

  const jobPayload: Record<string, unknown> = {
    customer_id: input.customerId,
    vehicle_id: input.vehicleId,
    service_type: input.serviceType,
    status: "New",
    tint_percentage: input.tintPercentage ?? null,
    customer_notes: input.customerNotes || null,
    source: input.source,
    tint_quote_lead_id: leadUuid,
    tint_quote_lead_ref: leadRefString,
  };

  const { data: job, error } = await supabase
    .from("jobs")
    .insert(jobPayload)
    .select("id")
    .single();

  if (error) {
    return {
      ok: false,
      error: error.message || "Job insert failed",
      details: error,
    };
  }

  if (!job) {
    return {
      ok: false,
      error: "Job insert failed",
      details: { message: "Insert returned no row" },
    };
  }

  return {
    ok: true,
    jobId: job.id,
    customerId: input.customerId,
    vehicleId: input.vehicleId || undefined,
    duplicate: false,
  };
}

export async function syncWebsiteLeadToJob(
  supabase: SupabaseClient,
  input: SyncWebsiteLeadInput & { tintPercentage?: string | null },
): Promise<WebsiteJobCreationResult> {
  const { customer, error: customerError } = await findOrCreateCustomer(
    supabase,
    input.body,
  );

  if (customerError || !customer) {
    console.error(
      "[website-lead] Customer create/find failed:",
      customerError,
    );
    return {
      ok: false,
      error: customerError?.message || "Customer create/find failed",
      details: customerError,
    };
  }

  let vehicleId: string | null = null;

  if (hasVehicleData(input.body)) {
    const { vehicle, error: vehicleError } = await createVehicleForCustomer(
      supabase,
      customer.id,
      input.body,
    );

    if (vehicleError || !vehicle) {
      console.error("[website-lead] Vehicle create failed:", vehicleError);
      return {
        ok: false,
        error: vehicleError?.message || "Vehicle create failed",
        details: vehicleError,
        customerId: customer.id,
      };
    }

    vehicleId = vehicle.id;
  }

  return createJobFromWebsiteLead(supabase, {
    body: input.body,
    leadId: input.leadId,
    customerId: customer.id,
    vehicleId,
    serviceType: input.serviceType,
    customerNotes: input.customerNotes,
    source: input.source,
    tintPercentage: input.tintPercentage ?? null,
  });
}
