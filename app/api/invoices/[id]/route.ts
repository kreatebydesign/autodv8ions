import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const { id } = await context.params;
  const { data, error: dbError } = await supabase
    .from("invoices")
    .select("*, customers(*)")
    .eq("id", id)
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ invoice: data });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const { id } = await context.params;
  const body = await request.json();

  const { data, error: dbError } = await supabase
    .from("invoices")
    .update({
      paid: body.paid,
      notes: body.notes,
      deposit: body.deposit,
      balance_due: body.balanceDue,
      line_items: body.lineItems,
    })
    .eq("id", id)
    .select("*, customers(*)")
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ invoice: data });
}
