import {
  DriveAuthError,
  getDriveAuthMode,
  sanitizeErrorMessage,
} from "@/lib/google/auth-drive";
import { discoverTintJobsDriveInventory } from "@/lib/google/drive-discovery";
import { buildImportPlan } from "@/lib/live-portfolio/import-plan";
import type {
  ExistingGalleryItemSnapshot,
  ExistingGalleryMediaSnapshot,
} from "@/lib/live-portfolio/import-plan-types";
import {
  PENDING_IMPORT_GUARANTEE,
  buildGalleryItemWriteRow,
  buildGalleryMediaWriteRow,
  parsePendingImportRequest,
  selectRecentImportBatch,
  type PendingImportLimits,
  type PendingImportRequestBody,
} from "@/lib/live-portfolio/pending-import";
import type { PendingImportResponse } from "@/lib/live-portfolio/pending-import-types";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

const GALLERY_ITEM_REQUIRED_SELECT =
  "id, slug, vehicle, service_type, work_date, status, published, provisional_vehicle, drive_folder_id, drive_parent_folder_id, drive_folder_name, source_month_folder_name, validation_errors, import_scope, shade_percentage, seo_title, seo_description, photos, videos";

const GALLERY_MEDIA_REQUIRED_SELECT =
  "id, gallery_item_id, drive_file_id, drive_file_name, mime_type, media_type, is_featured, storage_url, validation_status, sort_order";

export type SchemaVerificationResult =
  | { ok: true; checked: string[] }
  | { ok: false; code: "schema_missing"; message: string; missing: string[] };

/**
 * Verify Phase 0 migration 003 fields/tables exist.
 * Write mode must NOT silently fall back when gallery_media is missing.
 */
export async function verifyLivePortfolioSchema(
  supabase: SupabaseClient,
): Promise<SchemaVerificationResult> {
  const checked: string[] = [];
  const missing: string[] = [];

  const { error: itemsError } = await supabase
    .from("gallery_items")
    .select(GALLERY_ITEM_REQUIRED_SELECT)
    .limit(1);

  if (itemsError) {
    missing.push("gallery_items (Phase 0 columns)");
  } else {
    checked.push("gallery_items");
  }

  const { error: mediaError } = await supabase
    .from("gallery_media")
    .select(GALLERY_MEDIA_REQUIRED_SELECT)
    .limit(1);

  if (mediaError) {
    missing.push("gallery_media");
  } else {
    checked.push("gallery_media");
  }

  if (missing.length > 0) {
    return {
      ok: false,
      code: "schema_missing",
      message:
        "Required Live Portfolio schema is missing. Apply supabase/migrations/003_live_portfolio_foundations.sql before pending import.",
      missing,
    };
  }

  return { ok: true, checked };
}

/**
 * Strict snapshot loader for write mode — fails if gallery_media cannot be read.
 */
export async function loadExistingPortfolioSnapshotsStrict(
  supabase: SupabaseClient,
): Promise<{
  items: ExistingGalleryItemSnapshot[];
  media: ExistingGalleryMediaSnapshot[];
}> {
  const { data: items, error: itemsError } = await supabase
    .from("gallery_items")
    .select(
      "id, slug, vehicle, work_date, status, published, provisional_vehicle, drive_folder_id, drive_folder_name, source_month_folder_name, shade_percentage, seo_title, seo_description",
    )
    .limit(5000);

  if (itemsError) {
    throw new DriveAuthError(
      "portfolio_read_failed",
      sanitizeErrorMessage(itemsError.message),
    );
  }

  const { data: media, error: mediaError } = await supabase
    .from("gallery_media")
    .select(
      "id, gallery_item_id, drive_file_id, drive_file_name, mime_type, media_type, is_featured, storage_url",
    )
    .limit(20000);

  if (mediaError) {
    throw new DriveAuthError(
      "schema_missing",
      sanitizeErrorMessage(
        `gallery_media read failed (no silent empty fallback in write mode): ${mediaError.message}`,
      ),
    );
  }

  return {
    items: (items || []) as ExistingGalleryItemSnapshot[],
    media: (media || []) as ExistingGalleryMediaSnapshot[],
  };
}

async function insertPendingGalleryItem(
  supabase: SupabaseClient,
  row: ReturnType<typeof buildGalleryItemWriteRow>,
): Promise<{ id: string } | { matchedId: string } | { error: string }> {
  const existing = await supabase
    .from("gallery_items")
    .select("id")
    .eq("drive_folder_id", row.drive_folder_id)
    .maybeSingle();

  if (existing.data?.id) {
    return { matchedId: existing.data.id };
  }

  const { data, error } = await supabase
    .from("gallery_items")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    // Race: another writer inserted the same Drive folder ID
    if (error.code === "23505" || /duplicate|unique/i.test(error.message)) {
      const again = await supabase
        .from("gallery_items")
        .select("id")
        .eq("drive_folder_id", row.drive_folder_id)
        .maybeSingle();
      if (again.data?.id) return { matchedId: again.data.id };

      // Slug collision with a different folder — retry with Drive-ID suffix
      const retryRow = {
        ...row,
        slug: `${row.slug}-${row.drive_folder_id.slice(0, 12)}`.slice(0, 180),
      };
      const retry = await supabase
        .from("gallery_items")
        .insert(retryRow)
        .select("id")
        .single();
      if (retry.data?.id) return { id: retry.data.id };
      return { error: sanitizeErrorMessage(retry.error?.message || error.message) };
    }
    return { error: sanitizeErrorMessage(error.message) };
  }

  if (!data?.id) return { error: "gallery_item_insert_returned_no_id" };
  return { id: data.id };
}

async function insertPendingGalleryMedia(
  supabase: SupabaseClient,
  row: ReturnType<typeof buildGalleryMediaWriteRow>,
): Promise<"created" | "matched" | { error: string }> {
  const existing = await supabase
    .from("gallery_media")
    .select("id")
    .eq("drive_file_id", row.drive_file_id)
    .limit(1);

  if (existing.data?.[0]?.id) return "matched";

  const { error } = await supabase.from("gallery_media").insert(row);

  if (error) {
    if (error.code === "23505" || /duplicate|unique/i.test(error.message)) {
      return "matched";
    }
    return { error: sanitizeErrorMessage(error.message) };
  }

  return "created";
}

/**
 * Controlled recent-first pending-only DB import.
 * Creates gallery_items (pending) + gallery_media metadata only.
 */
export async function runPendingDriveImport(
  body: PendingImportRequestBody,
): Promise<PendingImportResponse> {
  const parsed = parsePendingImportRequest(body);
  if (!parsed.ok) {
    return {
      ok: false,
      writesPerformed: false,
      authMode: getDriveAuthMode(),
      counts: {
        createdGalleryItems: 0,
        matchedGalleryItems: 0,
        createdMedia: 0,
        matchedMedia: 0,
        skipped: 0,
        conflicts: 0,
        warnings: 0,
      },
      skips: [],
      conflicts: [],
      warnings: [],
      batchLimits: {
        maxMonths: 0,
        maxItems: 0,
        maxMedia: 0,
        monthsSelected: 0,
        itemsSelected: 0,
        mediaSelected: 0,
        remainingMonthsEstimate: 0,
        remainingItemsEstimate: 0,
        remainingMediaEstimate: 0,
        truncatedByLimits: false,
      },
      truncated: { months: false, jobs: false, media: false },
      transaction: {
        mode: "per_job_compensating",
        committed: false,
        rolledBack: false,
        jobsAttempted: 0,
        jobsCommitted: 0,
        jobsRolledBack: 0,
        detail: "Rejected before any writes.",
      },
      guarantee: PENDING_IMPORT_GUARANTEE,
      error: { code: parsed.code, message: parsed.message },
    };
  }

  const limits: PendingImportLimits = parsed.limits;
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return {
      ok: false,
      writesPerformed: false,
      authMode: getDriveAuthMode(),
      counts: {
        createdGalleryItems: 0,
        matchedGalleryItems: 0,
        createdMedia: 0,
        matchedMedia: 0,
        skipped: 0,
        conflicts: 0,
        warnings: 0,
      },
      skips: [],
      conflicts: [],
      warnings: [],
      batchLimits: {
        ...limits,
        monthsSelected: 0,
        itemsSelected: 0,
        mediaSelected: 0,
        remainingMonthsEstimate: 0,
        remainingItemsEstimate: 0,
        remainingMediaEstimate: 0,
        truncatedByLimits: false,
      },
      truncated: { months: false, jobs: false, media: false },
      transaction: {
        mode: "per_job_compensating",
        committed: false,
        rolledBack: false,
        jobsAttempted: 0,
        jobsCommitted: 0,
        jobsRolledBack: 0,
        detail: "Supabase admin client unavailable.",
      },
      guarantee: PENDING_IMPORT_GUARANTEE,
      error: {
        code: "supabase_not_configured",
        message: "Database is not configured.",
      },
    };
  }

  try {
    const schema = await verifyLivePortfolioSchema(supabase);
    if (!schema.ok) {
      return {
        ok: false,
        writesPerformed: false,
        authMode: getDriveAuthMode(),
        counts: {
          createdGalleryItems: 0,
          matchedGalleryItems: 0,
          createdMedia: 0,
          matchedMedia: 0,
          skipped: 0,
          conflicts: 0,
          warnings: 0,
        },
        skips: [],
        conflicts: [],
        warnings: [],
        batchLimits: {
          ...limits,
          monthsSelected: 0,
          itemsSelected: 0,
          mediaSelected: 0,
          remainingMonthsEstimate: 0,
          remainingItemsEstimate: 0,
          remainingMediaEstimate: 0,
          truncatedByLimits: false,
        },
        truncated: { months: false, jobs: false, media: false },
        transaction: {
          mode: "per_job_compensating",
          committed: false,
          rolledBack: false,
          jobsAttempted: 0,
          jobsCommitted: 0,
          jobsRolledBack: 0,
          detail: "Schema verification failed; no writes attempted.",
        },
        guarantee: PENDING_IMPORT_GUARANTEE,
        schemaVerified: false,
        error: {
          code: schema.code,
          message: `${schema.message} Missing: ${schema.missing.join(", ")}.`,
        },
      };
    }

    const discovery = await discoverTintJobsDriveInventory();
    const batch = selectRecentImportBatch(discovery, limits);
    const existing = await loadExistingPortfolioSnapshotsStrict(supabase);
    const plan = buildImportPlan({
      discovery: batch.discoverySlice,
      existingItems: existing.items,
      existingMedia: existing.media,
    });

    const folderToItemId = new Map<string, string>();
    let createdGalleryItems = 0;
    let matchedGalleryItems = 0;
    let createdMedia = 0;
    let matchedMedia = 0;
    let jobsAttempted = 0;
    let jobsCommitted = 0;
    let jobsRolledBack = 0;
    const createdItemSamples: NonNullable<
      PendingImportResponse["samples"]
    >["createdItems"] = [];
    const createdMediaSamples: NonNullable<
      PendingImportResponse["samples"]
    >["createdMedia"] = [];
    const writeWarnings = [...plan.planned.warnings];

    for (const match of plan.planned.existingGalleryItemMatches) {
      folderToItemId.set(match.driveFolderId, match.existing.id);
      matchedGalleryItems += 1;
    }
    matchedMedia += plan.planned.existingGalleryMediaMatches.length;

    // Create new gallery items + their media (per-job compensating rollback)
    for (const item of plan.planned.newGalleryItems) {
      jobsAttempted += 1;

      const row = buildGalleryItemWriteRow({
        driveFolderId: item.driveFolderId,
        driveParentFolderId: item.driveParentFolderId,
        slug: item.metadata.slugCandidate,
        vehicle:
          item.metadata.vehicleLabelCandidate || item.metadata.sourceFolderName,
        workDate: item.metadata.workDateCandidate,
        driveFolderName: item.metadata.sourceFolderName,
        sourceMonthFolderName: item.metadata.sourceMonthFolderName,
        validationErrors: item.warnings,
      });

      const inserted = await insertPendingGalleryItem(supabase, row);
      if ("error" in inserted) {
        writeWarnings.push({
          code: "gallery_item_insert_failed",
          message: inserted.error,
          subjectType: "job_folder",
          subjectId: item.driveFolderId,
        });
        jobsRolledBack += 1;
        continue;
      }

      if ("matchedId" in inserted) {
        folderToItemId.set(item.driveFolderId, inserted.matchedId);
        matchedGalleryItems += 1;
        jobsCommitted += 1;
        continue;
      }

      const galleryItemId = inserted.id;
      folderToItemId.set(item.driveFolderId, galleryItemId);
      createdGalleryItems += 1;
      createdItemSamples.push({
        id: galleryItemId,
        driveFolderId: item.driveFolderId,
        vehicle: row.vehicle,
        status: "pending",
        published: false,
      });

      const mediaForItem = plan.planned.newGalleryMedia.filter(
        (m) => m.parentDriveFolderId === item.driveFolderId,
      );

      let mediaWriteFailed = false;
      let mediaCreatedForJob = 0;

      for (let i = 0; i < mediaForItem.length; i += 1) {
        const media = mediaForItem[i];
        const mediaRow = buildGalleryMediaWriteRow({
          galleryItemId,
          driveFileId: media.driveFileId,
          driveFileName: media.driveFileName,
          mimeType: media.mimeType,
          mediaKind: media.mediaKind,
          sortOrder: i,
        });

        const mediaResult = await insertPendingGalleryMedia(supabase, mediaRow);
        if (mediaResult === "created") {
          createdMedia += 1;
          mediaCreatedForJob += 1;
          createdMediaSamples.push({
            id: "created",
            driveFileId: media.driveFileId,
            galleryItemId,
            storageUrl: null,
            validationStatus: "pending",
          });
        } else if (mediaResult === "matched") {
          matchedMedia += 1;
        } else {
          mediaWriteFailed = true;
          writeWarnings.push({
            code: "gallery_media_insert_failed",
            message: mediaResult.error,
            subjectType: "media_file",
            subjectId: media.driveFileId,
          });
          break;
        }
      }

      if (mediaWriteFailed) {
        // Compensating rollback for this job unit only
        await supabase.from("gallery_items").delete().eq("id", galleryItemId);
        createdGalleryItems -= 1;
        createdMedia -= mediaCreatedForJob;
        createdItemSamples.pop();
        for (let i = createdMediaSamples.length - 1; i >= 0; i -= 1) {
          if (createdMediaSamples[i].galleryItemId === galleryItemId) {
            createdMediaSamples.splice(i, 1);
          }
        }
        jobsRolledBack += 1;
        continue;
      }

      jobsCommitted += 1;
    }

    // New media attached to already-matched gallery items
    for (const media of plan.planned.newGalleryMedia) {
      if (
        plan.planned.newGalleryItems.some(
          (item) => item.driveFolderId === media.parentDriveFolderId,
        )
      ) {
        continue;
      }

      const parentId =
        media.matchedGalleryItemId ||
        folderToItemId.get(media.parentDriveFolderId) ||
        null;
      if (!parentId) {
        writeWarnings.push({
          code: "media_parent_unresolved",
          message: `Could not resolve gallery item for Drive folder ${media.parentDriveFolderId}.`,
          subjectType: "media_file",
          subjectId: media.driveFileId,
        });
        continue;
      }

      const mediaRow = buildGalleryMediaWriteRow({
        galleryItemId: parentId,
        driveFileId: media.driveFileId,
        driveFileName: media.driveFileName,
        mimeType: media.mimeType,
        mediaKind: media.mediaKind,
        sortOrder: 0,
      });

      const mediaResult = await insertPendingGalleryMedia(supabase, mediaRow);
      if (mediaResult === "created") {
        createdMedia += 1;
        createdMediaSamples.push({
          id: "created",
          driveFileId: media.driveFileId,
          galleryItemId: parentId,
          storageUrl: null,
          validationStatus: "pending",
        });
      } else if (mediaResult === "matched") {
        matchedMedia += 1;
      } else {
        writeWarnings.push({
          code: "gallery_media_insert_failed",
          message: mediaResult.error,
          subjectType: "media_file",
          subjectId: media.driveFileId,
        });
      }
    }

    const writesPerformed = createdGalleryItems > 0 || createdMedia > 0;

    return {
      ok: true,
      writesPerformed,
      authMode: discovery.authMode,
      counts: {
        createdGalleryItems,
        matchedGalleryItems,
        createdMedia,
        matchedMedia,
        skipped: plan.totals.skipCount,
        conflicts: plan.totals.conflictCount,
        warnings: writeWarnings.length,
      },
      skips: plan.planned.skips,
      conflicts: plan.planned.conflicts,
      warnings: writeWarnings,
      batchLimits: {
        ...limits,
        monthsSelected: batch.monthsSelected,
        itemsSelected: batch.itemsSelected,
        mediaSelected: batch.mediaSelected,
        remainingMonthsEstimate: batch.remainingMonthsEstimate,
        remainingItemsEstimate: batch.remainingItemsEstimate,
        remainingMediaEstimate: batch.remainingMediaEstimate,
        truncatedByLimits: batch.truncatedByLimits,
      },
      truncated: batch.discoverySlice.truncated,
      transaction: {
        mode: "per_job_compensating",
        committed: jobsRolledBack === 0 || jobsCommitted > 0,
        rolledBack: jobsRolledBack > 0,
        jobsAttempted,
        jobsCommitted,
        jobsRolledBack,
        detail:
          jobsRolledBack > 0
            ? `Committed ${jobsCommitted} job unit(s); rolled back ${jobsRolledBack} failed job unit(s). Unique Drive IDs keep reruns idempotent.`
            : `Committed ${jobsCommitted} job unit(s) successfully.`,
      },
      guarantee: PENDING_IMPORT_GUARANTEE,
      schemaVerified: true,
      samples: {
        createdItems: createdItemSamples.slice(0, 8),
        createdMedia: createdMediaSamples.slice(0, 8),
      },
    };
  } catch (error) {
    if (error instanceof DriveAuthError) {
      return {
        ok: false,
        writesPerformed: false,
        authMode: getDriveAuthMode(),
        counts: {
          createdGalleryItems: 0,
          matchedGalleryItems: 0,
          createdMedia: 0,
          matchedMedia: 0,
          skipped: 0,
          conflicts: 0,
          warnings: 0,
        },
        skips: [],
        conflicts: [],
        warnings: [],
        batchLimits: {
          ...limits,
          monthsSelected: 0,
          itemsSelected: 0,
          mediaSelected: 0,
          remainingMonthsEstimate: 0,
          remainingItemsEstimate: 0,
          remainingMediaEstimate: 0,
          truncatedByLimits: false,
        },
        truncated: { months: false, jobs: false, media: false },
        transaction: {
          mode: "per_job_compensating",
          committed: false,
          rolledBack: false,
          jobsAttempted: 0,
          jobsCommitted: 0,
          jobsRolledBack: 0,
          detail: "Failed before or during import; see error.",
        },
        guarantee: PENDING_IMPORT_GUARANTEE,
        error: { code: error.code, message: error.message },
      };
    }

    return {
      ok: false,
      writesPerformed: false,
      authMode: getDriveAuthMode(),
      counts: {
        createdGalleryItems: 0,
        matchedGalleryItems: 0,
        createdMedia: 0,
        matchedMedia: 0,
        skipped: 0,
        conflicts: 0,
        warnings: 0,
      },
      skips: [],
      conflicts: [],
      warnings: [],
      batchLimits: {
        ...limits,
        monthsSelected: 0,
        itemsSelected: 0,
        mediaSelected: 0,
        remainingMonthsEstimate: 0,
        remainingItemsEstimate: 0,
        remainingMediaEstimate: 0,
        truncatedByLimits: false,
      },
      truncated: { months: false, jobs: false, media: false },
      transaction: {
        mode: "per_job_compensating",
        committed: false,
        rolledBack: false,
        jobsAttempted: 0,
        jobsCommitted: 0,
        jobsRolledBack: 0,
        detail: "Unexpected failure; see error.",
      },
      guarantee: PENDING_IMPORT_GUARANTEE,
      error: {
        code: "pending_import_failed",
        message: sanitizeErrorMessage(
          error instanceof Error ? error.message : "Pending import failed.",
        ),
      },
    };
  }
}
