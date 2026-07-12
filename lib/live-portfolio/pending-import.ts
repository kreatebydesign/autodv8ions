import type { DriveDiscoveryResult, DiscoveredMonthFolder } from "./discovery-types";
import type { DriveImportPlan } from "./import-plan-types";
import { PORTFOLIO_SERVICE_TYPE } from "./constants";
import type {
  GalleryItemWriteRow,
  GalleryMediaWriteRow,
  PendingImportResponse,
  PendingImportResultCounts,
  PendingImportTransactionResult,
  PendingImportWriteStore,
} from "./pending-import-types";

export const PENDING_IMPORT_DEFAULTS = {
  maxMonths: 3,
  maxItems: 60,
  maxMedia: 150,
  hardMaxMonths: 3,
  hardMaxItems: 60,
  hardMaxMedia: 150,
} as const;

export const PENDING_IMPORT_GUARANTEE =
  "Pending-only metadata import. Records created as status=pending, published=false. No media downloads, Blob uploads, public URLs, or publishing.";

export type PendingImportRequestBody = {
  confirmPendingImport?: unknown;
  maxMonths?: unknown;
  maxItems?: unknown;
  maxMedia?: unknown;
};

export type PendingImportLimits = {
  maxMonths: number;
  maxItems: number;
  maxMedia: number;
};

export type PendingImportBatchSelection = {
  limits: PendingImportLimits;
  monthsSelected: number;
  itemsSelected: number;
  mediaSelected: number;
  remainingMonthsEstimate: number;
  remainingItemsEstimate: number;
  remainingMediaEstimate: number;
  truncatedByLimits: boolean;
  discoverySlice: DriveDiscoveryResult;
};

function clampInt(
  value: unknown,
  fallback: number,
  hardMax: number,
  hardMin = 1,
): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hardMax, Math.max(hardMin, Math.floor(n)));
}

export function parsePendingImportRequest(
  body: PendingImportRequestBody | null | undefined,
):
  | { ok: true; limits: PendingImportLimits }
  | { ok: false; code: string; message: string } {
  if (!body || body.confirmPendingImport !== true) {
    return {
      ok: false,
      code: "confirmation_required",
      message:
        'Pending import requires explicit confirmation: { "confirmPendingImport": true }.',
    };
  }

  return {
    ok: true,
    limits: {
      maxMonths: clampInt(
        body.maxMonths,
        PENDING_IMPORT_DEFAULTS.maxMonths,
        PENDING_IMPORT_DEFAULTS.hardMaxMonths,
      ),
      maxItems: clampInt(
        body.maxItems,
        PENDING_IMPORT_DEFAULTS.maxItems,
        PENDING_IMPORT_DEFAULTS.hardMaxItems,
      ),
      maxMedia: clampInt(
        body.maxMedia,
        PENDING_IMPORT_DEFAULTS.maxMedia,
        PENDING_IMPORT_DEFAULTS.hardMaxMedia,
      ),
    },
  };
}

/**
 * Recent-first batch selection from a discovery result.
 * Discovery months are expected newest-first.
 */
export function selectRecentImportBatch(
  discovery: DriveDiscoveryResult,
  limits: PendingImportLimits,
): PendingImportBatchSelection {
  const selectedMonths: DiscoveredMonthFolder[] = [];
  let itemsSelected = 0;
  let mediaSelected = 0;
  let truncatedByLimits = false;

  for (const month of discovery.months) {
    if (selectedMonths.length >= limits.maxMonths) {
      truncatedByLimits = true;
      break;
    }

    const jobs = [];
    for (const job of month.jobs) {
      if (itemsSelected >= limits.maxItems) {
        truncatedByLimits = true;
        break;
      }

      const remainingMedia = limits.maxMedia - mediaSelected;
      if (remainingMedia <= 0) {
        truncatedByLimits = true;
        break;
      }

      const media = job.media.slice(0, remainingMedia);
      if (media.length < job.media.length) truncatedByLimits = true;

      jobs.push({
        ...job,
        media,
        mediaTruncated: job.mediaTruncated || media.length < job.media.length,
      });
      itemsSelected += 1;
      mediaSelected += media.length;
    }

    selectedMonths.push({
      ...month,
      jobs,
      jobsTruncated: month.jobsTruncated || jobs.length < month.jobs.length,
    });

    if (itemsSelected >= limits.maxItems || mediaSelected >= limits.maxMedia) {
      truncatedByLimits = true;
      break;
    }
  }

  const monthsSelected = selectedMonths.length;
  const totalJobs = discovery.totals.jobFolderCount;
  const totalMedia = discovery.totals.mediaFileCount;
  const totalMonths = discovery.totals.monthFolderCount;

  return {
    limits,
    monthsSelected,
    itemsSelected,
    mediaSelected,
    remainingMonthsEstimate: Math.max(0, totalMonths - monthsSelected),
    remainingItemsEstimate: Math.max(0, totalJobs - itemsSelected),
    remainingMediaEstimate: Math.max(0, totalMedia - mediaSelected),
    truncatedByLimits:
      truncatedByLimits ||
      discovery.truncated.months ||
      discovery.truncated.jobs ||
      discovery.truncated.media,
    discoverySlice: {
      ...discovery,
      months: selectedMonths,
      totals: {
        ...discovery.totals,
        monthFolderCount: monthsSelected,
        jobFolderCount: itemsSelected,
        mediaFileCount: mediaSelected,
      },
      truncated: {
        months: truncatedByLimits || discovery.truncated.months,
        jobs: truncatedByLimits || discovery.truncated.jobs,
        media: truncatedByLimits || discovery.truncated.media,
      },
    },
  };
}

export function buildGalleryItemWriteRow(input: {
  driveFolderId: string;
  driveParentFolderId: string | null;
  slug: string;
  vehicle: string;
  workDate: string | null;
  driveFolderName: string;
  sourceMonthFolderName: string | null;
  validationErrors?: unknown[];
}): GalleryItemWriteRow {
  return {
    slug: input.slug,
    vehicle: input.vehicle,
    service_type: PORTFOLIO_SERVICE_TYPE,
    work_date: input.workDate,
    photos: [],
    videos: [],
    seo_title: null,
    seo_description: null,
    published: false,
    status: "pending_review",
    shade_percentage: null,
    drive_folder_id: input.driveFolderId,
    drive_parent_folder_id: input.driveParentFolderId,
    drive_folder_name: input.driveFolderName,
    source_month_folder_name: input.sourceMonthFolderName,
    provisional_vehicle: true,
    validation_errors: input.validationErrors || [],
    import_scope: "recent",
  };
}

export function buildGalleryMediaWriteRow(input: {
  galleryItemId: string;
  driveFileId: string;
  driveFileName: string;
  mimeType: string;
  mediaKind: "image" | "video";
  sortOrder: number;
  driveCreatedAt?: string | null;
  driveModifiedAt?: string | null;
}): GalleryMediaWriteRow {
  return {
    gallery_item_id: input.galleryItemId,
    drive_file_id: input.driveFileId,
    drive_file_name: input.driveFileName,
    drive_created_at: input.driveCreatedAt ?? null,
    drive_modified_at: input.driveModifiedAt ?? null,
    storage_url: null,
    mime_type: input.mimeType,
    media_type: input.mediaKind,
    sort_order: input.sortOrder,
    is_featured: false,
    validation_status: "pending",
    rejected_reason: null,
  };
}

function emptyCounts(): PendingImportResultCounts {
  return {
    createdGalleryItems: 0,
    matchedGalleryItems: 0,
    createdMedia: 0,
    matchedMedia: 0,
    skipped: 0,
    conflicts: 0,
    warnings: 0,
  };
}

/**
 * Executes a pending-only import plan against an abstract store.
 * Per-job compensating rollback: if media writes fail after a new item insert,
 * the new item is deleted (cascading media) and counted as rolled back.
 * Human-edited matches are never overwritten.
 */
export function executePendingImportPlan(
  plan: DriveImportPlan,
  store: PendingImportWriteStore,
  options: {
    failAfterItemCreate?: boolean;
    authMode?: PendingImportResponse["authMode"];
    batchLimits: PendingImportResponse["batchLimits"];
  },
): PendingImportResponse {
  const counts = emptyCounts();
  const createdItemSamples: NonNullable<PendingImportResponse["samples"]>["createdItems"] =
    [];
  const createdMediaSamples: NonNullable<
    PendingImportResponse["samples"]
  >["createdMedia"] = [];

  let jobsAttempted = 0;
  let jobsCommitted = 0;
  let jobsRolledBack = 0;
  let hardFailure: string | null = null;

  store.begin();

  const folderToItemId = new Map<string, string>();

  for (const match of plan.planned.existingGalleryItemMatches) {
    folderToItemId.set(match.driveFolderId, match.existing.id);
    counts.matchedGalleryItems += 1;
  }

  for (const match of plan.planned.existingGalleryMediaMatches) {
    counts.matchedMedia += 1;
  }

  counts.skipped = plan.totals.skipCount;
  counts.conflicts = plan.totals.conflictCount;
  counts.warnings = plan.totals.warningCount;

  try {
    for (const item of plan.planned.newGalleryItems) {
      jobsAttempted += 1;

      const existing = store.findItemByDriveFolderId(item.driveFolderId);
      if (existing) {
        folderToItemId.set(item.driveFolderId, existing.id);
        counts.matchedGalleryItems += 1;
        jobsCommitted += 1;
        continue;
      }

      const row = buildGalleryItemWriteRow({
        driveFolderId: item.driveFolderId,
        driveParentFolderId: item.driveParentFolderId,
        slug: item.metadata.slugCandidate,
        vehicle: item.metadata.vehicleLabelCandidate || item.metadata.sourceFolderName,
        workDate: item.metadata.workDateCandidate,
        driveFolderName: item.metadata.sourceFolderName,
        sourceMonthFolderName: item.metadata.sourceMonthFolderName,
        validationErrors: item.warnings,
      });

      // Pending-only safety invariants
      if (row.published !== false || row.status !== "pending_review") {
        throw new Error("pending_defaults_violated");
      }

      let created: { id: string };
      try {
        created = store.insertItem(row);
      } catch (err) {
        hardFailure =
          err instanceof Error ? err.message : "gallery_item_insert_failed";
        break;
      }

      folderToItemId.set(item.driveFolderId, created.id);
      counts.createdGalleryItems += 1;
      createdItemSamples.push({
        id: created.id,
        driveFolderId: item.driveFolderId,
        vehicle: row.vehicle,
        status: "pending_review",
        published: false,
      });

      if (options.failAfterItemCreate) {
        store.deleteItem(created.id);
        counts.createdGalleryItems -= 1;
        createdItemSamples.pop();
        jobsRolledBack += 1;
        hardFailure = "forced_rollback_after_item_create";
        store.rollback();
        break;
      }

      const mediaForItem = plan.planned.newGalleryMedia.filter(
        (m) => m.parentDriveFolderId === item.driveFolderId,
      );

      let mediaFailed = false;
      for (let i = 0; i < mediaForItem.length; i += 1) {
        const media = mediaForItem[i];
        const existingMedia = store.findMediaByDriveFileId(media.driveFileId);
        if (existingMedia) {
          counts.matchedMedia += 1;
          continue;
        }

        try {
          const mediaRow = buildGalleryMediaWriteRow({
            galleryItemId: created.id,
            driveFileId: media.driveFileId,
            driveFileName: media.driveFileName,
            mimeType: media.mimeType,
            mediaKind: media.mediaKind,
            sortOrder: i,
          });
          if (mediaRow.storage_url !== null || mediaRow.is_featured !== false) {
            throw new Error("media_pending_defaults_violated");
          }
          const inserted = store.insertMedia(mediaRow);
          counts.createdMedia += 1;
          createdMediaSamples.push({
            id: inserted.id,
            driveFileId: media.driveFileId,
            galleryItemId: created.id,
            storageUrl: null,
            validationStatus: "pending",
          });
        } catch (err) {
          mediaFailed = true;
          hardFailure =
            err instanceof Error ? err.message : "gallery_media_insert_failed";
          break;
        }
      }

      if (mediaFailed) {
        store.deleteItem(created.id);
        counts.createdGalleryItems -= 1;
        counts.createdMedia = Math.max(
          0,
          counts.createdMedia -
            createdMediaSamples.filter((s) => s.galleryItemId === created.id)
              .length,
        );
        for (let i = createdMediaSamples.length - 1; i >= 0; i -= 1) {
          if (createdMediaSamples[i].galleryItemId === created.id) {
            createdMediaSamples.splice(i, 1);
          }
        }
        createdItemSamples.pop();
        jobsRolledBack += 1;
        store.rollback();
        break;
      }

      jobsCommitted += 1;
    }

    // Media whose parent was an existing match (or created earlier)
    if (!hardFailure) {
      for (const media of plan.planned.newGalleryMedia) {
        const parentId =
          media.matchedGalleryItemId ||
          folderToItemId.get(media.parentDriveFolderId) ||
          null;
        if (!parentId) continue;

        // Skip media already handled under new-item loop
        if (
          plan.planned.newGalleryItems.some(
            (item) => item.driveFolderId === media.parentDriveFolderId,
          )
        ) {
          continue;
        }

        const existingMedia = store.findMediaByDriveFileId(media.driveFileId);
        if (existingMedia) {
          counts.matchedMedia += 1;
          continue;
        }

        try {
          const mediaRow = buildGalleryMediaWriteRow({
            galleryItemId: parentId,
            driveFileId: media.driveFileId,
            driveFileName: media.driveFileName,
            mimeType: media.mimeType,
            mediaKind: media.mediaKind,
            sortOrder: 0,
          });
          const inserted = store.insertMedia(mediaRow);
          counts.createdMedia += 1;
          createdMediaSamples.push({
            id: inserted.id,
            driveFileId: media.driveFileId,
            galleryItemId: parentId,
            storageUrl: null,
            validationStatus: "pending",
          });
        } catch (err) {
          hardFailure =
            err instanceof Error ? err.message : "gallery_media_insert_failed";
          store.rollback();
          break;
        }
      }
    }

    if (!hardFailure) {
      store.commit();
    } else {
      // Full in-memory / batch rollback: discard create counts from this run.
      counts.createdGalleryItems = 0;
      counts.createdMedia = 0;
      createdItemSamples.length = 0;
      createdMediaSamples.length = 0;
      jobsCommitted = 0;
    }
  } catch (err) {
    hardFailure = err instanceof Error ? err.message : "import_failed";
    store.rollback();
    jobsRolledBack += 1;
    counts.createdGalleryItems = 0;
    counts.createdMedia = 0;
    createdItemSamples.length = 0;
    createdMediaSamples.length = 0;
    jobsCommitted = 0;
  }

  const transaction: PendingImportTransactionResult = {
    mode: "in_memory",
    committed: !hardFailure,
    rolledBack: Boolean(hardFailure),
    jobsAttempted,
    jobsCommitted,
    jobsRolledBack,
    detail: hardFailure
      ? `Rolled back after failure: ${hardFailure}`
      : "All attempted job units committed.",
  };

  const writesPerformed =
    !hardFailure &&
    (counts.createdGalleryItems > 0 || counts.createdMedia > 0);

  return {
    ok: !hardFailure,
    writesPerformed,
    authMode: options.authMode || plan.authMode,
    counts,
    skips: plan.planned.skips,
    conflicts: plan.planned.conflicts,
    warnings: plan.planned.warnings,
    batchLimits: options.batchLimits,
    truncated: plan.truncated,
    transaction,
    guarantee: PENDING_IMPORT_GUARANTEE,
    schemaVerified: true,
    samples: {
      createdItems: createdItemSamples.slice(0, 8),
      createdMedia: createdMediaSamples.slice(0, 8),
    },
    ...(hardFailure
      ? {
          error: {
            code: "import_write_failed",
            message: hardFailure,
          },
        }
      : {}),
  };
}

/** Simple in-memory store for unit tests. */
export function createInMemoryPendingImportStore(seed?: {
  items?: Array<{ id: string; drive_folder_id: string; vehicle?: string; provisional_vehicle?: boolean }>;
  media?: Array<{ id: string; gallery_item_id: string; drive_file_id: string; storage_url?: string | null; is_featured?: boolean }>;
}): PendingImportWriteStore & {
  items: Map<string, GalleryItemWriteRow & { id: string }>;
  media: Map<string, GalleryMediaWriteRow & { id: string }>;
  snapshot(): { itemIds: string[]; mediaIds: string[] };
} {
  const items = new Map<string, GalleryItemWriteRow & { id: string }>();
  const media = new Map<string, GalleryMediaWriteRow & { id: string }>();
  const byDriveFolder = new Map<string, string>();
  const byDriveFile = new Map<string, string>();

  let txItems: Map<string, GalleryItemWriteRow & { id: string }> | null = null;
  let txMedia: Map<string, GalleryMediaWriteRow & { id: string }> | null = null;
  let txByDriveFolder: Map<string, string> | null = null;
  let txByDriveFile: Map<string, string> | null = null;
  let seq = 0;

  for (const item of seed?.items || []) {
    const row = {
      id: item.id,
      ...buildGalleryItemWriteRow({
        driveFolderId: item.drive_folder_id,
        driveParentFolderId: null,
        slug: `seed-${item.id}`,
        vehicle: item.vehicle || "Seed",
        workDate: null,
        driveFolderName: item.vehicle || "Seed",
        sourceMonthFolderName: null,
      }),
      provisional_vehicle: (item.provisional_vehicle ?? true) as true,
    };
    items.set(item.id, row);
    byDriveFolder.set(item.drive_folder_id, item.id);
  }
  for (const m of seed?.media || []) {
    const row = {
      id: m.id,
      ...buildGalleryMediaWriteRow({
        galleryItemId: m.gallery_item_id,
        driveFileId: m.drive_file_id,
        driveFileName: "seed.jpg",
        mimeType: "image/jpeg",
        mediaKind: "image",
        sortOrder: 0,
      }),
      storage_url: (m.storage_url ?? null) as null,
      is_featured: (m.is_featured ? false : false) as false,
    };
    media.set(m.id, row);
    byDriveFile.set(m.drive_file_id, m.id);
  }

  function activeItems() {
    return txItems || items;
  }
  function activeMedia() {
    return txMedia || media;
  }
  function activeByFolder() {
    return txByDriveFolder || byDriveFolder;
  }
  function activeByFile() {
    return txByDriveFile || byDriveFile;
  }

  return {
    items,
    media,
    begin() {
      txItems = new Map(items);
      txMedia = new Map(media);
      txByDriveFolder = new Map(byDriveFolder);
      txByDriveFile = new Map(byDriveFile);
    },
    commit() {
      if (!txItems || !txMedia || !txByDriveFolder || !txByDriveFile) return;
      items.clear();
      for (const [k, v] of txItems) items.set(k, v);
      media.clear();
      for (const [k, v] of txMedia) media.set(k, v);
      byDriveFolder.clear();
      for (const [k, v] of txByDriveFolder) byDriveFolder.set(k, v);
      byDriveFile.clear();
      for (const [k, v] of txByDriveFile) byDriveFile.set(k, v);
      txItems = null;
      txMedia = null;
      txByDriveFolder = null;
      txByDriveFile = null;
    },
    rollback() {
      txItems = null;
      txMedia = null;
      txByDriveFolder = null;
      txByDriveFile = null;
    },
    findItemByDriveFolderId(driveFolderId) {
      const id = activeByFolder().get(driveFolderId);
      return id ? { id } : null;
    },
    findMediaByDriveFileId(driveFileId) {
      const id = activeByFile().get(driveFileId);
      if (!id) return null;
      const row = activeMedia().get(id);
      return row ? { id, gallery_item_id: row.gallery_item_id } : null;
    },
    insertItem(row) {
      seq += 1;
      const id = row.id || `gi-${seq}`;
      if (activeByFolder().has(row.drive_folder_id)) {
        throw new Error("duplicate_drive_folder_id");
      }
      const full = { ...row, id };
      activeItems().set(id, full);
      activeByFolder().set(row.drive_folder_id, id);
      return { id };
    },
    insertMedia(row) {
      seq += 1;
      const id = row.id || `gm-${seq}`;
      if (activeByFile().has(row.drive_file_id)) {
        throw new Error("duplicate_drive_file_id");
      }
      const full = { ...row, id };
      activeMedia().set(id, full);
      activeByFile().set(row.drive_file_id, id);
      return { id };
    },
    deleteItem(id) {
      const row = activeItems().get(id);
      if (!row) return;
      activeItems().delete(id);
      activeByFolder().delete(row.drive_folder_id);
      for (const [mediaId, m] of [...activeMedia().entries()]) {
        if (m.gallery_item_id === id) {
          activeMedia().delete(mediaId);
          activeByFile().delete(m.drive_file_id);
        }
      }
    },
    snapshot() {
      return {
        itemIds: [...items.keys()],
        mediaIds: [...media.keys()],
      };
    },
  };
}
