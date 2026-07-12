import { getSupabaseAdmin } from "@/lib/supabase/server";

export type ArchiveResult =
  | { ok: true; id: string; status: "archived" | "archived_review" }
  | { ok: false; error: string };

/**
 * Soft-archive a gallery item. Never deletes Drive, rows, or editorial fields.
 */
export async function archiveGalleryItem(options: {
  id: string;
  mode: "showcase" | "review_queue";
}): Promise<ArchiveResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Database unavailable." };

  const status =
    options.mode === "review_queue" ? "archived_review" : "archived";
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("gallery_items")
    .update({
      published: false,
      status,
      archived_at: now,
      pinned: false,
      // Keep published_at / approved_at for history
    })
    .eq("id", options.id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: error?.message || "Unable to archive item." };
  }

  return { ok: true, id: data.id, status };
}

/**
 * Restore an archived / archived_review item into the review queue.
 * Does not reprocess blobs — caller may enqueue media reprocessing when purged.
 */
export async function restoreGalleryItemToReview(
  id: string,
): Promise<
  | {
      ok: true;
      id: string;
      needsReprocess: boolean;
    }
  | { ok: false; error: string }
> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Database unavailable." };

  const { data: item, error } = await supabase
    .from("gallery_items")
    .select("id, status, blob_purged_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !item) {
    return { ok: false, error: "Gallery item not found." };
  }

  if (item.status !== "archived" && item.status !== "archived_review") {
    return { ok: false, error: "Only archived projects can be restored." };
  }

  const { data: media } = await supabase
    .from("gallery_media")
    .select("id, blob_key, storage_pathname, blob_purged_at, processing_status")
    .eq("gallery_item_id", id);

  const rows = media || [];
  const needsReprocess = rows.some(
    (m) =>
      Boolean(m.blob_purged_at) ||
      (!m.blob_key && !m.storage_pathname) ||
      m.processing_status === "failed",
  );

  const { error: updateError } = await supabase
    .from("gallery_items")
    .update({
      published: false,
      status: "pending_review",
      archived_at: null,
      blob_purged_at: null,
      provisional_vehicle: true,
    })
    .eq("id", id);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  if (needsReprocess && rows.length > 0) {
    await supabase
      .from("gallery_media")
      .update({
        processing_status: "pending_download",
        processing_error: null,
        blob_purged_at: null,
      })
      .eq("gallery_item_id", id)
      .or("blob_purged_at.not.is.null,blob_key.is.null,processing_status.eq.failed");
  }

  return { ok: true, id, needsReprocess };
}
