import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { restoreGalleryItemToReview } from "@/lib/portfolio-engine/archive";
import { setGalleryItemPinned } from "@/lib/portfolio-engine/stats";
import { trimReviewQueue } from "@/lib/portfolio-engine/rotation";
import { runGalleryMediaProcessing } from "@/lib/live-portfolio/media-process";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Restore / pin / trim helpers for the Portfolio Engine.
 * Restore never creates duplicate gallery items.
 */
export async function POST(request: Request) {
  const { error } = await requireAdminSession();
  if (error) return error;

  let body: {
    id?: string;
    action?: "restore" | "pin" | "unpin" | "trim_queue";
    reprocess?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.action === "trim_queue") {
    const trim = await trimReviewQueue();
    if (!trim.ok) {
      return NextResponse.json({ error: trim.error }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      archivedIds: trim.archivedIds,
      queueSize: trim.queueSize,
    });
  }

  if (!body.id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  if (body.action === "pin" || body.action === "unpin") {
    const result = await setGalleryItemPinned(body.id, body.action === "pin");
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, pinned: body.action === "pin" });
  }

  if (body.action !== "restore") {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  const restored = await restoreGalleryItemToReview(body.id);
  if (!restored.ok) {
    return NextResponse.json({ error: restored.error }, { status: 400 });
  }

  let reprocess: unknown = null;
  if (restored.needsReprocess && body.reprocess !== false) {
    const supabase = getSupabaseAdmin();
    const { data: media } = supabase
      ? await supabase
          .from("gallery_media")
          .select("id")
          .eq("gallery_item_id", body.id)
          .eq("processing_status", "pending_download")
      : { data: [] as { id: string }[] };

    const mediaIds = (media || []).map((m) => m.id);
    if (mediaIds.length > 0) {
      reprocess = await runGalleryMediaProcessing({
        confirmMediaProcess: true,
        mediaIds,
        maxItems: mediaIds.length,
      });
    }
  }

  const trim = await trimReviewQueue();

  return NextResponse.json({
    ok: true,
    restored,
    reprocess,
    reviewQueueTrim: trim.ok ? trim : { error: trim.error },
  });
}
