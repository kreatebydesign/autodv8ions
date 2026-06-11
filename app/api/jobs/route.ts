import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ jobs: [], configured: false });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const serviceType = searchParams.get("serviceType");
  const search = searchParams.get("search")?.trim();

  let query = supabase
    .from("jobs")
    .select("*, customers(*), vehicles(*)")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (serviceType) query = query.eq("service_type", serviceType);

  const { data, error: dbError } = await query;

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  let jobs = data || [];

  if (search) {
    const q = search.toLowerCase();
    jobs = jobs.filter((job) => {
      const customer = job.customers;
      const vehicle = job.vehicles;
      const haystack = [
        customer?.first_name,
        customer?.last_name,
        customer?.phone,
        customer?.email,
        vehicle?.year,
        vehicle?.make,
        vehicle?.model,
        job.service_type,
        job.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  return NextResponse.json({ jobs, configured: true });
}

export async function POST(request: Request) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const body = await request.json();

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .insert({
      first_name: body.firstName || "",
      last_name: body.lastName || "",
      phone: body.phone || null,
      email: body.email || null,
    })
    .select("*")
    .single();

  if (customerError) {
    return NextResponse.json({ error: customerError.message }, { status: 500 });
  }

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .insert({
      customer_id: customer.id,
      year: body.year || null,
      make: body.make || null,
      model: body.model || null,
      color: body.color || null,
      vehicle_type: body.vehicleType || null,
    })
    .select("*")
    .single();

  if (vehicleError) {
    return NextResponse.json({ error: vehicleError.message }, { status: 500 });
  }

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .insert({
      customer_id: customer.id,
      vehicle_id: vehicle.id,
      service_type: body.serviceType || "Window Tint",
      status: body.status || "New",
      tint_percentage: body.tintPercentage || null,
      customer_notes: body.customerNotes || null,
      internal_notes: body.internalNotes || null,
      source: "manual",
    })
    .select("*, customers(*), vehicles(*)")
    .single();

  if (jobError) {
    return NextResponse.json({ error: jobError.message }, { status: 500 });
  }

  return NextResponse.json({ job });
}
