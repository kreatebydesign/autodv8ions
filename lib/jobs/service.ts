import { getSupabaseAdmin } from "@/lib/supabase/server";

type TintQuoteBody = Record<string, unknown>;

export async function createJobFromTintQuote(body: TintQuoteBody, leadId?: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const firstName = String(body.firstName || "").trim();
  const lastName = String(body.lastName || "").trim();
  const phone = String(body.phone || "").trim() || null;
  const email = String(body.email || "").trim() || null;

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .insert({
      first_name: firstName,
      last_name: lastName,
      phone,
      email,
    })
    .select("*")
    .single();

  if (customerError || !customer) {
    console.error("[jobs] customer create error:", customerError);
    return null;
  }

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .insert({
      customer_id: customer.id,
      year: body.year || null,
      make: body.make || null,
      model: body.model || null,
      color: body.vehicleColor || null,
      vehicle_type: body.vehicleType || null,
    })
    .select("*")
    .single();

  if (vehicleError || !vehicle) {
    console.error("[jobs] vehicle create error:", vehicleError);
    return null;
  }

  const customerNotes = [
    body.tintNotes ? `Tint Notes: ${body.tintNotes}` : null,
    body.vehicleNotes ? `Vehicle Notes: ${body.vehicleNotes}` : null,
    body.mainPriority ? `Priority: ${body.mainPriority}` : null,
    body.timeline ? `Timeline: ${body.timeline}` : null,
    body.contactMethod ? `Contact via: ${body.contactMethod}` : null,
    body.contactTime ? `Contact time: ${body.contactTime}` : null,
    body.currentTint ? `Current tint: ${body.currentTint}` : null,
    body.needTintRemoval ? `Tint removal: ${body.needTintRemoval}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .insert({
      customer_id: customer.id,
      vehicle_id: vehicle.id,
      service_type: "Window Tint",
      status: "New",
      tint_percentage: body.tintLevel || body.tintScope || null,
      customer_notes: customerNotes || null,
      source: "website-tint-quote",
      tint_quote_lead_id: leadId || null,
    })
    .select("*")
    .single();

  if (jobError) {
    console.error("[jobs] job create error:", jobError);
    return null;
  }

  return job;
}

export async function getDashboardStats() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return {
      newJobs: 0,
      scheduledToday: 0,
      readyForPickup: 0,
      completedThisMonth: 0,
    };
  }

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 86400000);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [newJobs, scheduledToday, readyForPickup, completedThisMonth] =
    await Promise.all([
      supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "New"),
      supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "Scheduled")
        .gte("scheduled_at", startOfDay.toISOString())
        .lt("scheduled_at", endOfDay.toISOString()),
      supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "Ready for Pickup"),
      supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "Completed")
        .gte("completed_at", startOfMonth.toISOString()),
    ]);

  return {
    newJobs: newJobs.count || 0,
    scheduledToday: scheduledToday.count || 0,
    readyForPickup: readyForPickup.count || 0,
    completedThisMonth: completedThisMonth.count || 0,
  };
}

export async function getRecentJobs(limit = 8) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data } = await supabase
    .from("jobs")
    .select("*, customers(*), vehicles(*)")
    .order("created_at", { ascending: false })
    .limit(limit);

  return data || [];
}
