import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  const { error } = await requireAdminSession();
  if (error) return error;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ invoices: [], configured: false });
  }

  const { data, error: dbError } = await supabase
    .from("invoices")
    .select("*, customers(*)")
    .order("created_at", { ascending: false });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ invoices: data || [], configured: true });
}

export async function POST(request: Request) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const body = await request.json();
  const lineItems = body.lineItems || [];
  const subtotal = lineItems.reduce(
    (sum: number, item: { amount: number }) => sum + Number(item.amount || 0),
    0,
  );
  const deposit = Number(body.deposit || 0);
  const balanceDue = body.balanceDue ?? subtotal - deposit;

  const { data, error: dbError } = await supabase
    .from("invoices")
    .insert({
      job_id: body.jobId || null,
      customer_id: body.customerId || null,
      vehicle_summary: body.vehicleSummary || null,
      line_items: lineItems,
      deposit,
      balance_due: balanceDue,
      paid: Boolean(body.paid),
      notes: body.notes || null,
    })
    .select("*, customers(*)")
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ invoice: data });
}
