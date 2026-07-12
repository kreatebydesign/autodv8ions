import {
  DriveAuthError,
  getDriveAuthMode,
  sanitizeErrorMessage,
} from "@/lib/google/auth-drive";
import { discoverTintJobsDriveInventory } from "@/lib/google/drive-discovery";
import {
  buildImportPlan,
  buildImportPlanPreview,
} from "@/lib/live-portfolio/import-plan";
import type {
  DriveImportPlanPreviewResponse,
  ExistingGalleryItemSnapshot,
  ExistingGalleryMediaSnapshot,
} from "@/lib/live-portfolio/import-plan-types";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * SELECT-only snapshot of existing portfolio records for dry-run matching.
 * Never writes.
 */
export async function loadExistingPortfolioSnapshots(): Promise<{
  items: ExistingGalleryItemSnapshot[];
  media: ExistingGalleryMediaSnapshot[];
}> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { items: [], media: [] };
  }

  const { data: items, error: itemsError } = await supabase
    .from("gallery_items")
    .select(
      "id, slug, vehicle, work_date, status, published, provisional_vehicle, drive_folder_id, drive_folder_name, source_month_folder_name, shade_percentage, seo_title, seo_description",
    )
    .limit(2000);

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
    .limit(10000);

  if (mediaError) {
    // Table may not exist yet pre-migration; treat as empty for dry-run safety.
    console.error("[import-plan] gallery_media read:", mediaError.message);
    return {
      items: (items || []) as ExistingGalleryItemSnapshot[],
      media: [],
    };
  }

  return {
    items: (items || []) as ExistingGalleryItemSnapshot[],
    media: (media || []) as ExistingGalleryMediaSnapshot[],
  };
}

/**
 * Admin dry-run import plan.
 * Discovers Drive inventory, reads existing DB rows (SELECT only), plans pending-only actions.
 * Guarantees writesPerformed=false.
 */
export async function previewDriveImportPlan(): Promise<DriveImportPlanPreviewResponse> {
  try {
    const discovery = await discoverTintJobsDriveInventory();
    const existing = await loadExistingPortfolioSnapshots();
    const plan = buildImportPlan({
      discovery,
      existingItems: existing.items,
      existingMedia: existing.media,
    });
    return buildImportPlanPreview(plan);
  } catch (error) {
    if (error instanceof DriveAuthError) {
      return {
        ok: false,
        writesPerformed: false,
        authMode: getDriveAuthMode(),
        discovered: {
          monthFolderCount: 0,
          jobFolderCount: 0,
          mediaFileCount: 0,
          ignoredCount: 0,
          warningCount: 0,
        },
        totals: {
          newGalleryItemCount: 0,
          existingGalleryItemMatchCount: 0,
          newGalleryMediaCount: 0,
          existingGalleryMediaMatchCount: 0,
          skipCount: 0,
          conflictCount: 0,
          warningCount: 0,
          unsupportedCount: 0,
          malformedCount: 0,
        },
        truncated: { months: false, jobs: false, media: false },
        samples: {
          newGalleryItems: [],
          existingMatches: [],
          conflicts: [],
          skips: [],
          warnings: [],
        },
        guarantee:
          "Dry run only. writesPerformed=false. No database writes, downloads, Blob uploads, or publishing occurred.",
        error: { code: error.code, message: error.message },
      };
    }

    return {
      ok: false,
      writesPerformed: false,
      authMode: getDriveAuthMode(),
      discovered: {
        monthFolderCount: 0,
        jobFolderCount: 0,
        mediaFileCount: 0,
        ignoredCount: 0,
        warningCount: 0,
      },
      totals: {
        newGalleryItemCount: 0,
        existingGalleryItemMatchCount: 0,
        newGalleryMediaCount: 0,
        existingGalleryMediaMatchCount: 0,
        skipCount: 0,
        conflictCount: 0,
        warningCount: 0,
        unsupportedCount: 0,
        malformedCount: 0,
      },
      truncated: { months: false, jobs: false, media: false },
      samples: {
        newGalleryItems: [],
        existingMatches: [],
        conflicts: [],
        skips: [],
        warnings: [],
      },
      guarantee:
        "Dry run only. writesPerformed=false. No database writes, downloads, Blob uploads, or publishing occurred.",
      error: {
        code: "import_plan_failed",
        message: sanitizeErrorMessage(
          error instanceof Error ? error.message : "Import plan failed.",
        ),
      },
    };
  }
}
