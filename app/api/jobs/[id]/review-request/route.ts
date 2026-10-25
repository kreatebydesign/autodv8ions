import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { getGoogleReviewUrl } from "@/lib/env/google-review";
import { getSupabaseAdmin } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

/** Returns whether a review request was already sent (GET) or records send (POST). */
export async function GET(_request: Request, context: RouteContext) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const reviewUrl = getGoogleReviewUrl();
  const { id } = await context.params;
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured." }, { status: 500 });
  }

  const { data: job } = await supabase
    .from("jobs")
    .select("id, status, review_request_sent_at")
    .eq("id", id)
    .is("archived_at", null)
    .maybeSingle();

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  return NextResponse.json({
    reviewUrlConfigured: Boolean(reviewUrl),
    reviewRequestSentAt: job.review_request_sent_at ?? null,
    eligible: job.status === "Completed" && !job.review_request_sent_at,
  });
}

export async function POST(_request: Request, context: RouteContext) {
  const { error } = await requireAdminSession();
  if (error) return error;

  if (!getGoogleReviewUrl()) {
    return NextResponse.json(
      { error: "Google review URL is not configured." },
      { status: 503 },
    );
  }

  const { id } = await context.params;
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured." }, { status: 500 });
  }

  const { data: job } = await supabase
    .from("jobs")
    .select("id, status, review_request_sent_at")
    .eq("id", id)
    .is("archived_at", null)
    .maybeSingle();

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  if (job.status !== "Completed") {
    return NextResponse.json(
      { error: "Review requests are only available for completed jobs." },
      { status: 400 },
    );
  }

  if (job.review_request_sent_at) {
    return NextResponse.json(
      { error: "A review request was already recorded for this job." },
      { status: 409 },
    );
  }

  const sentAt = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("jobs")
    .update({ review_request_sent_at: sentAt })
    .eq("id", id)
    .is("review_request_sent_at", null)
    .select("id, review_request_sent_at")
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: "Could not record review request." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    reviewRequestSentAt: updated.review_request_sent_at,
  });
}
