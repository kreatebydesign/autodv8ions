import type { DriveDiscoveryResult } from "./discovery-types";
import {
  IMPORT_PLAN_SAMPLE_LIMITS,
  type DriveImportPlan,
  type DriveImportPlanPreviewResponse,
  type ExistingGalleryItemSnapshot,
  type ExistingGalleryMediaSnapshot,
  type PlannedConflict,
  type PlannedExistingGalleryItemMatch,
  type PlannedExistingGalleryMediaMatch,
  type PlannedGalleryDefaults,
  type PlannedItemCandidateMetadata,
  type PlannedMalformed,
  type PlannedNewGalleryItem,
  type PlannedNewGalleryMedia,
  type PlannedSkip,
  type PlannedUnsupported,
  type PlannedWarning,
} from "./import-plan-types";
import {
  normalizeProvisionalVehicleLabel,
  parseMonthFolder,
  parseVehicleFolder,
} from "./parse-drive-folder";
import { PORTFOLIO_SERVICE_TYPE } from "./constants";
import { slugify } from "@/lib/utils/format";

const PENDING_DEFAULTS: PlannedGalleryDefaults = {
  status: "pending_review",
  published: false,
  featured: false,
  homepageVisible: false,
  publicMediaUrl: null,
};

function isHumanEdited(item: ExistingGalleryItemSnapshot): boolean {
  if (item.provisional_vehicle === false) return true;
  if (
    item.status === "published" ||
    item.status === "approved" ||
    item.status === "failed" ||
    item.status === "rejected" ||
    item.status === "archived" ||
    item.status === "archived_review"
  ) {
    return true;
  }
  return false;
}

export function buildSlugCandidate(
  vehicleLabel: string,
  workDate: string | null,
  driveFolderId: string,
): string {
  const parts = [
    workDate?.slice(0, 7) || null,
    vehicleLabel || "vehicle",
    PORTFOLIO_SERVICE_TYPE,
    "altoona-pa",
    driveFolderId.slice(0, 8),
  ]
    .filter(Boolean)
    .map((part) => slugify(String(part)));
  return parts.join("-").replace(/-+/g, "-") || `tint-${driveFolderId}`;
}

export function buildCandidateMetadata(input: {
  jobFolderId: string;
  jobFolderName: string;
  monthFolderId: string | null;
  monthFolderName: string | null;
  year: number | null;
  month: number | null;
  sortKey: string | null;
}): PlannedItemCandidateMetadata {
  const monthParsed = parseMonthFolder(input.monthFolderName || "");
  const vehicleParsed = parseVehicleFolder(input.jobFolderName, monthParsed);
  const vehicleLabel =
    normalizeProvisionalVehicleLabel(
      vehicleParsed.vehicle || vehicleParsed.rawName || input.jobFolderName,
    ) || input.jobFolderName;

  const workDate = vehicleParsed.workDate;
  const displayTitle = vehicleLabel || input.jobFolderName;

  return {
    sourceFolderName: input.jobFolderName,
    sourceMonthFolderName: input.monthFolderName,
    monthFolderId: input.monthFolderId,
    year: input.year ?? monthParsed.year,
    month: input.month ?? monthParsed.month,
    sortKey: input.sortKey ?? monthParsed.sortKey,
    displayTitleCandidate: displayTitle,
    vehicleLabelCandidate: vehicleLabel,
    workDateCandidate: workDate,
    slugCandidate: buildSlugCandidate(vehicleLabel, workDate, input.jobFolderId),
    provisionalVehicle: true,
  };
}

export function buildImportPlan(input: {
  discovery: DriveDiscoveryResult;
  existingItems: ExistingGalleryItemSnapshot[];
  existingMedia: ExistingGalleryMediaSnapshot[];
}): DriveImportPlan {
  const { discovery, existingItems, existingMedia } = input;

  const itemsByDriveFolderId = new Map<string, ExistingGalleryItemSnapshot>();
  const itemsByFolderName = new Map<string, ExistingGalleryItemSnapshot[]>();
  const itemsBySlug = new Map<string, ExistingGalleryItemSnapshot>();

  for (const item of existingItems) {
    if (item.drive_folder_id) {
      itemsByDriveFolderId.set(item.drive_folder_id, item);
    }
    if (item.drive_folder_name) {
      const key = item.drive_folder_name.trim().toLowerCase();
      const list = itemsByFolderName.get(key) || [];
      list.push(item);
      itemsByFolderName.set(key, list);
    }
    if (item.slug) {
      itemsBySlug.set(item.slug, item);
    }
  }

  const mediaByDriveFileId = new Map<string, ExistingGalleryMediaSnapshot>();
  const mediaByName = new Map<string, ExistingGalleryMediaSnapshot[]>();
  for (const media of existingMedia) {
    if (media.drive_file_id) {
      mediaByDriveFileId.set(media.drive_file_id, media);
    }
    const key = media.drive_file_name.trim().toLowerCase();
    if (key) {
      const list = mediaByName.get(key) || [];
      list.push(media);
      mediaByName.set(key, list);
    }
  }

  const newGalleryItems: PlannedNewGalleryItem[] = [];
  const existingGalleryItemMatches: PlannedExistingGalleryItemMatch[] = [];
  const newGalleryMedia: PlannedNewGalleryMedia[] = [];
  const existingGalleryMediaMatches: PlannedExistingGalleryMediaMatch[] = [];
  const skips: PlannedSkip[] = [];
  const conflicts: PlannedConflict[] = [];
  const warnings: PlannedWarning[] = [];
  const unsupported: PlannedUnsupported[] = [];
  const malformed: PlannedMalformed[] = [];

  for (const w of discovery.warnings) {
    warnings.push({ ...w, subjectType: "discovery" });
  }

  for (const ignored of discovery.ignored) {
    skips.push({
      kind: "skip",
      subjectType: "other",
      subjectId: ignored.id,
      subjectName: ignored.name,
      reason: ignored.reason,
      detail: ignored.detail,
    });
  }

  for (const month of discovery.months) {
    if (!month.parseOk) {
      malformed.push({
        kind: "malformed",
        subjectType: "month_folder",
        subjectId: month.folderId,
        subjectName: month.folderName,
        reason: "unparsed_month_folder",
        detail:
          "Month/year could not be parsed confidently. Job folders beneath it are still planned using Drive IDs.",
      });
      warnings.push({
        code: "unparsed_month_folder",
        message: `Month folder "${month.folderName}" is malformed/unparsed.`,
        subjectType: "month_folder",
        subjectId: month.folderId,
      });
    }

    for (const ignored of month.ignored) {
      skips.push({
        kind: "skip",
        subjectType: "other",
        subjectId: ignored.id,
        subjectName: ignored.name,
        reason: ignored.reason,
        detail: ignored.detail,
      });
    }

    for (const job of month.jobs) {
      if (!job.folderId) {
        malformed.push({
          kind: "malformed",
          subjectType: "job_folder",
          subjectId: null,
          subjectName: job.folderName,
          reason: "missing_drive_folder_id",
          detail: "Job folder is missing a Drive ID and cannot be planned.",
        });
        continue;
      }

      const metadata = buildCandidateMetadata({
        jobFolderId: job.folderId,
        jobFolderName: job.folderName,
        monthFolderId: month.folderId,
        monthFolderName: month.folderName,
        year: month.year,
        month: month.month,
        sortKey: month.sortKey,
      });

      if (!metadata.vehicleLabelCandidate) {
        malformed.push({
          kind: "malformed",
          subjectType: "job_folder",
          subjectId: job.folderId,
          subjectName: job.folderName,
          reason: "empty_vehicle_label",
          detail: "Folder name did not yield a usable vehicle/job label candidate.",
        });
      }

      for (const w of job.warnings) {
        warnings.push({
          ...w,
          subjectType: "job_folder",
          subjectId: job.folderId,
        });
      }

      const existingById = itemsByDriveFolderId.get(job.folderId);
      const sameNameOthers =
        itemsByFolderName.get(job.folderName.trim().toLowerCase()) || [];
      for (const other of sameNameOthers) {
        if (other.drive_folder_id && other.drive_folder_id !== job.folderId) {
          conflicts.push({
            kind: "conflict",
            code: "duplicate_folder_name_different_id",
            subjectId: job.folderId,
            subjectName: job.folderName,
            existingId: other.id,
            detail: `Folder name "${job.folderName}" already exists on gallery item ${other.id} with a different Drive folder ID.`,
          });
        }
      }

      const slugOwner = itemsBySlug.get(metadata.slugCandidate);
      if (
        slugOwner &&
        slugOwner.drive_folder_id &&
        slugOwner.drive_folder_id !== job.folderId
      ) {
        conflicts.push({
          kind: "conflict",
          code: "slug_collision_different_drive_id",
          subjectId: job.folderId,
          subjectName: job.folderName,
          existingId: slugOwner.id,
          detail: `Slug candidate "${metadata.slugCandidate}" is already used by gallery item ${slugOwner.id}.`,
        });
      }

      const mediaIds = job.media.map((m) => m.fileId);

      if (existingById) {
        const preserve = isHumanEdited(existingById);
        if (
          preserve &&
          existingById.drive_folder_name &&
          existingById.drive_folder_name !== job.folderName
        ) {
          conflicts.push({
            kind: "conflict",
            code: "locked_item_name_drift",
            subjectId: job.folderId,
            subjectName: job.folderName,
            existingId: existingById.id,
            detail: `Existing locked/human-edited item "${existingById.vehicle}" has Drive folder name "${existingById.drive_folder_name}" but Drive now reports "${job.folderName}". Metadata will be preserved.`,
          });
        }

        existingGalleryItemMatches.push({
          kind: "existing_gallery_item_match",
          driveFolderId: job.folderId,
          matchReason: "drive_folder_id",
          existing: existingById,
          preserveHumanEditedMetadata: preserve,
          plannedMetadataIfProvisional: metadata,
          defaultsNote: preserve
            ? "Matched by drive_folder_id. Human-edited/locked metadata would be preserved; no overwrite planned."
            : "Matched by drive_folder_id. Provisional metadata could be refreshed later; still pending-only and unpublished.",
          mediaFileIds: mediaIds,
          warnings: job.warnings,
        });
      } else {
        newGalleryItems.push({
          kind: "new_gallery_item",
          driveFolderId: job.folderId,
          driveParentFolderId: month.folderId,
          metadata,
          defaults: PENDING_DEFAULTS,
          mediaFileIds: mediaIds,
          warnings: job.warnings,
        });
      }

      for (const ignored of job.ignored) {
        if (
          ignored.reason === "unsupported_mime" ||
          ignored.reason === "google_workspace_file" ||
          ignored.reason === "pdf" ||
          ignored.reason === "archive"
        ) {
          unsupported.push({
            kind: "unsupported",
            subjectType: "media_file",
            subjectId: ignored.id,
            subjectName: ignored.name,
            reason: ignored.reason,
            detail: ignored.detail,
          });
        } else {
          skips.push({
            kind: "skip",
            subjectType: "media_file",
            subjectId: ignored.id,
            subjectName: ignored.name,
            reason: ignored.reason,
            detail: ignored.detail,
          });
        }
      }

      for (const media of job.media) {
        const existingMedia = mediaByDriveFileId.get(media.fileId);
        if (existingMedia) {
          existingGalleryMediaMatches.push({
            kind: "existing_gallery_media_match",
            driveFileId: media.fileId,
            matchReason: "drive_file_id",
            existing: existingMedia,
            parentDriveFolderId: job.folderId,
            preserveFeaturedAndStorage: true,
          });
          continue;
        }

        const sameName = mediaByName.get(media.fileName.trim().toLowerCase()) || [];
        for (const other of sameName) {
          if (other.drive_file_id && other.drive_file_id !== media.fileId) {
            conflicts.push({
              kind: "conflict",
              code: "media_name_collision_different_id",
              subjectId: media.fileId,
              subjectName: media.fileName,
              existingId: other.id,
              detail: `Media file name "${media.fileName}" already exists with a different Drive file ID.`,
            });
          }
        }

        newGalleryMedia.push({
          kind: "new_gallery_media",
          driveFileId: media.fileId,
          driveFileName: media.fileName,
          mimeType: media.mimeType,
          mediaKind: media.mediaKind,
          extension: media.extension,
          parentDriveFolderId: job.folderId,
          matchedGalleryItemId: existingById?.id ?? null,
          defaults: {
            isFeatured: false,
            storageUrl: null,
            publicMediaUrl: null,
          },
        });
      }
    }
  }

  return {
    writesPerformed: false,
    authMode: discovery.authMode,
    discovered: {
      monthFolderCount: discovery.totals.monthFolderCount,
      jobFolderCount: discovery.totals.jobFolderCount,
      mediaFileCount: discovery.totals.mediaFileCount,
      ignoredCount: discovery.totals.ignoredCount,
      warningCount: discovery.totals.warningCount,
    },
    planned: {
      newGalleryItems,
      existingGalleryItemMatches,
      newGalleryMedia,
      existingGalleryMediaMatches,
      skips,
      conflicts,
      warnings,
      unsupported,
      malformed,
    },
    totals: {
      newGalleryItemCount: newGalleryItems.length,
      existingGalleryItemMatchCount: existingGalleryItemMatches.length,
      newGalleryMediaCount: newGalleryMedia.length,
      existingGalleryMediaMatchCount: existingGalleryMediaMatches.length,
      skipCount: skips.length,
      conflictCount: conflicts.length,
      warningCount: warnings.length,
      unsupportedCount: unsupported.length,
      malformedCount: malformed.length,
    },
    truncated: discovery.truncated,
  };
}

export function buildImportPlanPreview(
  plan: DriveImportPlan,
): DriveImportPlanPreviewResponse {
  return {
    ok: true,
    writesPerformed: false,
    authMode: plan.authMode,
    discovered: plan.discovered,
    totals: plan.totals,
    truncated: plan.truncated,
    samples: {
      newGalleryItems: plan.planned.newGalleryItems
        .slice(0, IMPORT_PLAN_SAMPLE_LIMITS.newItems)
        .map((item) => ({
          driveFolderId: item.driveFolderId,
          displayTitleCandidate: item.metadata.displayTitleCandidate,
          slugCandidate: item.metadata.slugCandidate,
          mediaCount: item.mediaFileIds.length,
        })),
      existingMatches: plan.planned.existingGalleryItemMatches
        .slice(0, IMPORT_PLAN_SAMPLE_LIMITS.existingMatches)
        .map((item) => ({
          driveFolderId: item.driveFolderId,
          existingId: item.existing.id,
          existingVehicle: item.existing.vehicle,
          preserveHumanEditedMetadata: item.preserveHumanEditedMetadata,
        })),
      conflicts: plan.planned.conflicts.slice(
        0,
        IMPORT_PLAN_SAMPLE_LIMITS.conflicts,
      ),
      skips: plan.planned.skips.slice(0, IMPORT_PLAN_SAMPLE_LIMITS.skips),
      warnings: plan.planned.warnings.slice(0, IMPORT_PLAN_SAMPLE_LIMITS.warnings),
    },
    guarantee:
      "Dry run only. writesPerformed=false. No database writes, downloads, Blob uploads, or publishing occurred.",
  };
}
