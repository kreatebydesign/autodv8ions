import {
  GoogleDriveSourceConnector,
  getDefaultStorageProvider,
  runProcessingBatch,
  type AssetIngestJobInput,
  type AssetObjectIdentity,
  type AssetProcessingStatus,
  type ProcessedAssetResult,
  type ProcessingBatchResult,
  resolveIngestLimits,
  HARD_ASSET_INGEST_CAPS,
} from "@/lib/asset-engine";
import { sanitizeErrorMessage } from "@/lib/google/auth-drive";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export type MediaProcessRequestBody = {
  confirmMediaProcess?: unknown;
  maxItems?: unknown;
  mediaIds?: unknown;
  retryFailed?: unknown;
};

export type GalleryMediaProcessRow = {
  id: string;
  gallery_item_id: string;
  drive_file_id: string | null;
  drive_file_name: string;
  mime_type: string;
  media_type: string;
  content_hash: string | null;
  processing_status: AssetProcessingStatus;
  processing_attempts: number;
  blob_key: string | null;
  bytes: number | null;
};

function clampMaxItems(value: unknown): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : NaN;
  if (!Number.isFinite(n)) return resolveIngestLimits().maxItemsPerRun;
  return Math.min(
    HARD_ASSET_INGEST_CAPS.maxItemsPerRun,
    Math.max(1, Math.floor(n)),
  );
}

export function parseMediaProcessRequest(
  body: MediaProcessRequestBody | null | undefined,
):
  | {
      ok: true;
      maxItems: number;
      mediaIds: string[] | null;
      retryFailed: boolean;
    }
  | { ok: false; code: string; message: string } {
  if (!body || body.confirmMediaProcess !== true) {
    return {
      ok: false,
      code: "confirmation_required",
      message:
        'Media processing requires explicit confirmation: { "confirmMediaProcess": true }.',
    };
  }

  let mediaIds: string[] | null = null;
  if (Array.isArray(body.mediaIds)) {
    mediaIds = body.mediaIds.filter((id): id is string => typeof id === "string");
    if (mediaIds.length === 0) mediaIds = null;
  }

  return {
    ok: true,
    maxItems: clampMaxItems(body.maxItems),
    mediaIds,
    retryFailed: body.retryFailed === true,
  };
}

function toIdentity(row: GalleryMediaProcessRow): AssetObjectIdentity {
  const sourceObjectId = row.drive_file_id;
  if (!sourceObjectId) {
    throw new Error("Media row is missing drive_file_id / source object id.");
  }

  return {
    recordId: row.id,
    sourceConnector: "google_drive",
    sourceObjectId,
    filename: row.drive_file_name || "file",
    mimeType: row.mime_type || "application/octet-stream",
    mediaKind: row.media_type === "video" ? "video" : "image",
  };
}

function toJob(row: GalleryMediaProcessRow): AssetIngestJobInput {
  return {
    identity: toIdentity(row),
    processingStatus: row.processing_status || "pending_download",
    existingBlobKey: row.blob_key,
    existingChecksum: row.content_hash,
    attempts: row.processing_attempts || 0,
  };
}

export async function listMediaProcessingQueue(options?: {
  limit?: number;
}): Promise<{
  counts: Record<AssetProcessingStatus | "queued", number>;
  items: Array<{
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
  }>;
}> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return {
      counts: {
        queued: 0,
        pending_download: 0,
        downloaded: 0,
        processed: 0,
        ready_for_review: 0,
        failed: 0,
      },
      items: [],
    };
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
  const counts: Record<AssetProcessingStatus | "queued", number> = {
    queued: 0,
    pending_download: 0,
    downloaded: 0,
    processed: 0,
    ready_for_review: 0,
    failed: 0,
  };

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

async function loadJobs(input: {
  maxItems: number;
  mediaIds: string[] | null;
  retryFailed: boolean;
}): Promise<GalleryMediaProcessRow[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Database is not configured.");

  let query = supabase
    .from("gallery_media")
    .select(
      "id, gallery_item_id, drive_file_id, drive_file_name, mime_type, media_type, content_hash, processing_status, processing_attempts, blob_key, bytes",
    )
    .not("drive_file_id", "is", null)
    .limit(input.maxItems);

  if (input.mediaIds) {
    query = query.in("id", input.mediaIds);
  } else if (input.retryFailed) {
    query = query.eq("processing_status", "failed");
  } else {
    query = query.in("processing_status", ["pending_download", "failed"]);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(sanitizeErrorMessage(error.message));
  }

  return (data || []) as GalleryMediaProcessRow[];
}

async function persistSuccess(
  row: GalleryMediaProcessRow,
  result: ProcessedAssetResult,
) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Database is not configured.");

  const { error } = await supabase
    .from("gallery_media")
    .update({
      processing_status: "ready_for_review",
      processing_error: null,
      processing_attempts: (row.processing_attempts || 0) + 1,
      processed_at: new Date().toISOString(),
      blob_key: result.original.key,
      blob_provider: result.original.provider,
      storage_pathname: result.original.pathname,
      // Keep storage_url null — no public URL in Phase 2A
      storage_url: null,
      mime_type: result.originalMimeType,
      original_mime_type: result.originalMimeType,
      derived_mime_type: result.derivedMimeType,
      width: result.width,
      height: result.height,
      bytes: result.byteLength,
      content_hash: result.checksumSha256,
      duration_seconds: result.durationSeconds,
      variants: result.variants,
      uploaded_to_storage_at: result.original.uploadedAt,
      source_connector: "google_drive",
      source_object_id: row.drive_file_id,
      validation_status: "needs_review",
    })
    .eq("id", row.id);

  if (error) {
    throw new Error(sanitizeErrorMessage(error.message));
  }
}

async function persistFailure(
  row: GalleryMediaProcessRow,
  message: string,
  attempts: number,
) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  await supabase
    .from("gallery_media")
    .update({
      processing_status: "failed",
      processing_error: sanitizeErrorMessage(message).slice(0, 500),
      processing_attempts: attempts,
    })
    .eq("id", row.id);
}

/**
 * AutoDV8ions adapter: claim pending gallery_media and run Asset Engine ingest.
 * Private Blob only. No publishing.
 */
export async function runGalleryMediaProcessing(
  body: MediaProcessRequestBody,
): Promise<{
  ok: boolean;
  writesPerformed: boolean;
  published: false;
  publicUrlsCreated: false;
  batch: ProcessingBatchResult | null;
  summary: {
    processed: number;
    skipped: number;
    failed: number;
    claimed: number;
  };
  error?: { code: string; message: string };
}> {
  const parsed = parseMediaProcessRequest(body);
  if (!parsed.ok) {
    return {
      ok: false,
      writesPerformed: false,
      published: false,
      publicUrlsCreated: false,
      batch: null,
      summary: { processed: 0, skipped: 0, failed: 0, claimed: 0 },
      error: { code: parsed.code, message: parsed.message },
    };
  }

  try {
    const rows = await loadJobs(parsed);
    if (rows.length === 0) {
      return {
        ok: true,
        writesPerformed: false,
        published: false,
        publicUrlsCreated: false,
        batch: {
          mode: "synchronous",
          processed: 0,
          skipped: 0,
          failed: 0,
          results: [],
          limits: resolveIngestLimits({ maxItemsPerRun: parsed.maxItems }),
        },
        summary: { processed: 0, skipped: 0, failed: 0, claimed: 0 },
      };
    }

    const supabase = getSupabaseAdmin();
    if (supabase) {
      // Reset failed rows so Retry Failed re-enters the pipeline cleanly.
      const failedIds = rows
        .filter((r) => r.processing_status === "failed")
        .map((r) => r.id);
      if (failedIds.length > 0) {
        await supabase
          .from("gallery_media")
          .update({
            processing_status: "pending_download",
            processing_error: null,
          })
          .in("id", failedIds);

        for (const row of rows) {
          if (row.processing_status === "failed") {
            row.processing_status = "pending_download";
          }
        }
      }
    }

    const source = new GoogleDriveSourceConnector();
    const storage = getDefaultStorageProvider();
    const jobs = rows.map(toJob);

    const batch = await runProcessingBatch({
      batch: {
        jobs,
        limits: { maxItemsPerRun: parsed.maxItems },
      },
      source,
      storage,
    });

    let processed = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < batch.results.length; i += 1) {
      const result = batch.results[i];
      const row = rows[i];
      if (!result.ok) {
        failed += 1;
        await persistFailure(row, result.message, result.attempts);
        continue;
      }
      if (result.skipped) {
        skipped += 1;
        continue;
      }
      await persistSuccess(row, result.result);
      processed += 1;
    }

    return {
      ok: true,
      writesPerformed: processed > 0 || failed > 0,
      published: false,
      publicUrlsCreated: false,
      batch,
      summary: {
        processed,
        skipped,
        failed,
        claimed: rows.length,
      },
    };
  } catch (error) {
    return {
      ok: false,
      writesPerformed: false,
      published: false,
      publicUrlsCreated: false,
      batch: null,
      summary: { processed: 0, skipped: 0, failed: 0, claimed: 0 },
      error: {
        code: "media_process_failed",
        message: sanitizeErrorMessage(
          error instanceof Error ? error.message : "Media processing failed.",
        ),
      },
    };
  }
}
