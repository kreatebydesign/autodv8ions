/**
 * Media Workspace queue listing — Supabase only.
 * Intentionally does not import @/lib/asset-engine (sharp / Drive / Blob).
 * Queue load must not depend on image processing natives.
 */

import type { AssetProcessingStatus } from "@/lib/asset-engine/types";
import { sanitizeErrorMessage } from "@/lib/google/auth-drive";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export type MediaQueueItem = {
  id: string;
  galleryItemId: string;
  filename: string;
  mimeType: string;
  mediaType: string;
  processingStatus: AssetProcessingStatus;
  processingError: string | null;
  processingAttempts: number;
  bytes: number | null;
  blobKey: string | null;
  width: number | null;
  height: number | null;
};

export type MediaQueueResult = {
  counts: Record<AssetProcessingStatus | "queued", number>;
  items: MediaQueueItem[];
};

function emptyCounts(): Record<AssetProcessingStatus | "queued", number> {
  return {
    queued: 0,
    pending_download: 0,
    downloaded: 0,
    processed: 0,
    ready_for_review: 0,
    failed: 0,
  };
}

/**
 * Read-only inventory for Media Workspace.
 * Does not touch Drive, Blob, or sharp.
 */
export async function listMediaProcessingQueue(options?: {
  limit?: number;
}): Promise<MediaQueueResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Database is not configured.");
  }

  const { data, error } = await supabase
    .from("gallery_media")
    .select(
      "id, gallery_item_id, drive_file_name, mime_type, media_type, processing_status, processing_error, processing_attempts, bytes, blob_key, width, height, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 100);

  if (error) {
    throw new Error(sanitizeErrorMessage(error.message));
  }

  const rows = data || [];
  const counts = emptyCounts();

  for (const row of rows) {
    const status = (row.processing_status ||
      "pending_download") as AssetProcessingStatus;
    counts[status] = (counts[status] || 0) + 1;
    if (status === "pending_download" || status === "failed") {
      counts.queued += 1;
    }
  }

  return {
    counts,
    items: rows.map((row) => ({
      id: row.id,
      galleryItemId: row.gallery_item_id,
      filename: row.drive_file_name,
      mimeType: row.mime_type,
      mediaType: row.media_type,
      processingStatus: (row.processing_status ||
        "pending_download") as AssetProcessingStatus,
      processingError: row.processing_error,
      processingAttempts: row.processing_attempts || 0,
      bytes: row.bytes,
      blobKey: row.blob_key,
      width: row.width,
      height: row.height,
    })),
  };
}
