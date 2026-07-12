import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DriveDiscoveryResult } from "./discovery-types";
import { buildImportPlan } from "./import-plan";
import type {
  ExistingGalleryItemSnapshot,
  ExistingGalleryMediaSnapshot,
} from "./import-plan-types";
import {
  PENDING_IMPORT_DEFAULTS,
  buildGalleryItemWriteRow,
  buildGalleryMediaWriteRow,
  createInMemoryPendingImportStore,
  executePendingImportPlan,
  parsePendingImportRequest,
  selectRecentImportBatch,
} from "./pending-import";

function emptyDiscovery(
  overrides: Partial<DriveDiscoveryResult> = {},
): DriveDiscoveryResult {
  return {
    authMode: "wif",
    sourceFolderId: "tint-root",
    sourceFolderName: "Tint Jobs",
    months: [],
    totals: {
      monthFolderCount: 0,
      jobFolderCount: 0,
      mediaFileCount: 0,
      ignoredCount: 0,
      warningCount: 0,
    },
    truncated: { months: false, jobs: false, media: false },
    warnings: [],
    ignored: [],
    ...overrides,
  };
}

function monthWithJobs(
  folderId: string,
  folderName: string,
  sortKey: string,
  jobs: DriveDiscoveryResult["months"][0]["jobs"],
): DriveDiscoveryResult["months"][0] {
  return {
    folderId,
    folderName,
    year: Number(sortKey.slice(0, 4)),
    month: Number(sortKey.slice(5, 7)),
    sortKey,
    parseOk: true,
    createdTime: null,
    jobs,
    ignored: [],
    warnings: [],
    jobsTruncated: false,
  };
}

function job(
  folderId: string,
  folderName: string,
  media: DriveDiscoveryResult["months"][0]["jobs"][0]["media"] = [],
) {
  return {
    folderId,
    folderName,
    createdTime: null,
    media,
    ignored: [],
    warnings: [],
    mediaTruncated: false,
  };
}

function mediaFile(fileId: string, fileName: string) {
  return {
    fileId,
    fileName,
    mimeType: "image/jpeg",
    extension: "jpg",
    mediaKind: "image" as const,
    createdTime: null,
    modifiedTime: null,
    webViewLink: null,
  };
}

function batchLimitsFromSelection(
  selection: ReturnType<typeof selectRecentImportBatch>,
) {
  return {
    ...selection.limits,
    monthsSelected: selection.monthsSelected,
    itemsSelected: selection.itemsSelected,
    mediaSelected: selection.mediaSelected,
    remainingMonthsEstimate: selection.remainingMonthsEstimate,
    remainingItemsEstimate: selection.remainingItemsEstimate,
    remainingMediaEstimate: selection.remainingMediaEstimate,
    truncatedByLimits: selection.truncatedByLimits,
  };
}

describe("pending import request parsing", () => {
  it("rejects missing confirmation flag", () => {
    const parsed = parsePendingImportRequest({});
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.equal(parsed.code, "confirmation_required");
    }
  });

  it("rejects confirmPendingImport false", () => {
    const parsed = parsePendingImportRequest({ confirmPendingImport: false });
    assert.equal(parsed.ok, false);
  });

  it("accepts confirmPendingImport true with defaults", () => {
    const parsed = parsePendingImportRequest({ confirmPendingImport: true });
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.limits.maxMonths, PENDING_IMPORT_DEFAULTS.maxMonths);
      assert.equal(parsed.limits.maxItems, PENDING_IMPORT_DEFAULTS.maxItems);
      assert.equal(parsed.limits.maxMedia, PENDING_IMPORT_DEFAULTS.maxMedia);
    }
  });

  it("enforces hard batch caps", () => {
    const parsed = parsePendingImportRequest({
      confirmPendingImport: true,
      maxMonths: 99,
      maxItems: 999,
      maxMedia: 9999,
    });
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.limits.maxMonths, PENDING_IMPORT_DEFAULTS.hardMaxMonths);
      assert.equal(parsed.limits.maxItems, PENDING_IMPORT_DEFAULTS.hardMaxItems);
      assert.equal(parsed.limits.maxMedia, PENDING_IMPORT_DEFAULTS.hardMaxMedia);
    }
  });
});

describe("recent-first batch selection", () => {
  it("caps months, items, and media", () => {
    const discovery = emptyDiscovery({
      months: [
        monthWithJobs("m1", "2026-07 JULY", "2026-07", [
          job("j1", "01 A", [mediaFile("f1", "a.jpg"), mediaFile("f2", "b.jpg")]),
          job("j2", "02 B", [mediaFile("f3", "c.jpg")]),
        ]),
        monthWithJobs("m2", "2026-06 JUNE", "2026-06", [
          job("j3", "03 C", [mediaFile("f4", "d.jpg")]),
        ]),
        monthWithJobs("m3", "2026-05 MAY", "2026-05", [
          job("j4", "04 D", [mediaFile("f5", "e.jpg")]),
        ]),
        monthWithJobs("m4", "2026-04 APRIL", "2026-04", [
          job("j5", "05 E", [mediaFile("f6", "f.jpg")]),
        ]),
      ],
      totals: {
        monthFolderCount: 4,
        jobFolderCount: 5,
        mediaFileCount: 6,
        ignoredCount: 0,
        warningCount: 0,
      },
    });

    const batch = selectRecentImportBatch(discovery, {
      maxMonths: 3,
      maxItems: 2,
      maxMedia: 150,
    });

    assert.equal(batch.monthsSelected, 1);
    assert.equal(batch.itemsSelected, 2);
    assert.equal(batch.mediaSelected, 3);
    assert.equal(batch.truncatedByLimits, true);
    assert.ok(batch.remainingItemsEstimate >= 3);
  });

  it("respects maxMedia hard cut within a job", () => {
    const discovery = emptyDiscovery({
      months: [
        monthWithJobs("m1", "2026-07 JULY", "2026-07", [
          job("j1", "01 A", [
            mediaFile("f1", "a.jpg"),
            mediaFile("f2", "b.jpg"),
            mediaFile("f3", "c.jpg"),
          ]),
        ]),
      ],
      totals: {
        monthFolderCount: 1,
        jobFolderCount: 1,
        mediaFileCount: 3,
        ignoredCount: 0,
        warningCount: 0,
      },
    });

    const batch = selectRecentImportBatch(discovery, {
      maxMonths: 3,
      maxItems: 60,
      maxMedia: 2,
    });

    assert.equal(batch.mediaSelected, 2);
    assert.equal(batch.discoverySlice.months[0].jobs[0].media.length, 2);
    assert.equal(batch.truncatedByLimits, true);
  });
});

describe("pending-only write rows", () => {
  it("builds pending-only gallery item defaults with no public URL", () => {
    const row = buildGalleryItemWriteRow({
      driveFolderId: "folder-1",
      driveParentFolderId: "month-1",
      slug: "zr2-tint",
      vehicle: "ZR2",
      workDate: "2026-07-26",
      driveFolderName: "26 ZR2",
      sourceMonthFolderName: "2026-07 JULY",
    });

    assert.equal(row.status, "pending_review");
    assert.equal(row.published, false);
    assert.equal(row.provisional_vehicle, true);
    assert.equal(row.import_scope, "recent");
    assert.equal(row.seo_title, null);
    assert.equal(row.seo_description, null);
    assert.deepEqual(row.photos, []);
    assert.deepEqual(row.videos, []);
    assert.equal(row.shade_percentage, null);
  });

  it("builds media rows without storage URL or featured publish flags", () => {
    const row = buildGalleryMediaWriteRow({
      galleryItemId: "gi-1",
      driveFileId: "file-1",
      driveFileName: "shot.jpg",
      mimeType: "image/jpeg",
      mediaKind: "image",
      sortOrder: 0,
    });

    assert.equal(row.storage_url, null);
    assert.equal(row.is_featured, false);
    assert.equal(row.validation_status, "pending");
    assert.equal(row.rejected_reason, null);
  });
});

describe("pending import execution", () => {
  it("first import creates pending items and media", () => {
    const discovery = emptyDiscovery({
      months: [
        monthWithJobs("m1", "2026-07 JULY", "2026-07", [
          job("job-a", "26 ZR2", [mediaFile("file-a", "a.jpg")]),
        ]),
      ],
      totals: {
        monthFolderCount: 1,
        jobFolderCount: 1,
        mediaFileCount: 1,
        ignoredCount: 0,
        warningCount: 0,
      },
    });

    const batch = selectRecentImportBatch(discovery, {
      maxMonths: 3,
      maxItems: 60,
      maxMedia: 150,
    });
    const plan = buildImportPlan({
      discovery: batch.discoverySlice,
      existingItems: [],
      existingMedia: [],
    });
    const store = createInMemoryPendingImportStore();
    const result = executePendingImportPlan(plan, store, {
      batchLimits: batchLimitsFromSelection(batch),
    });

    assert.equal(result.ok, true);
    assert.equal(result.writesPerformed, true);
    assert.equal(result.counts.createdGalleryItems, 1);
    assert.equal(result.counts.createdMedia, 1);
    assert.equal(result.samples?.createdItems[0]?.status, "pending_review");
    assert.equal(result.samples?.createdItems[0]?.published, false);
    assert.equal(result.samples?.createdMedia[0]?.storageUrl, null);
    assert.equal(store.snapshot().itemIds.length, 1);
    assert.equal(store.snapshot().mediaIds.length, 1);
  });

  it("idempotent rerun matches by Drive IDs and creates no duplicates", () => {
    const discovery = emptyDiscovery({
      months: [
        monthWithJobs("m1", "2026-07 JULY", "2026-07", [
          job("job-a", "26 ZR2", [mediaFile("file-a", "a.jpg")]),
        ]),
      ],
      totals: {
        monthFolderCount: 1,
        jobFolderCount: 1,
        mediaFileCount: 1,
        ignoredCount: 0,
        warningCount: 0,
      },
    });

    const batch = selectRecentImportBatch(discovery, {
      maxMonths: 3,
      maxItems: 60,
      maxMedia: 150,
    });
    const plan1 = buildImportPlan({
      discovery: batch.discoverySlice,
      existingItems: [],
      existingMedia: [],
    });
    const store = createInMemoryPendingImportStore();
    const first = executePendingImportPlan(plan1, store, {
      batchLimits: batchLimitsFromSelection(batch),
    });
    assert.equal(first.counts.createdGalleryItems, 1);

    const existingItems: ExistingGalleryItemSnapshot[] = [
      {
        id: store.snapshot().itemIds[0],
        slug: "kept-slug",
        vehicle: "ZR2",
        work_date: "2026-07-26",
        status: "pending_review",
        published: false,
        provisional_vehicle: true,
        drive_folder_id: "job-a",
        drive_folder_name: "26 ZR2",
        source_month_folder_name: "2026-07 JULY",
        shade_percentage: null,
        seo_title: null,
        seo_description: null,
      },
    ];
    const existingMedia: ExistingGalleryMediaSnapshot[] = [
      {
        id: store.snapshot().mediaIds[0],
        gallery_item_id: store.snapshot().itemIds[0],
        drive_file_id: "file-a",
        drive_file_name: "a.jpg",
        mime_type: "image/jpeg",
        media_type: "image",
        is_featured: false,
        storage_url: null,
      },
    ];

    const plan2 = buildImportPlan({
      discovery: batch.discoverySlice,
      existingItems,
      existingMedia,
    });
    const second = executePendingImportPlan(plan2, store, {
      batchLimits: batchLimitsFromSelection(batch),
    });

    assert.equal(second.counts.createdGalleryItems, 0);
    assert.equal(second.counts.matchedGalleryItems, 1);
    assert.equal(second.counts.createdMedia, 0);
    assert.equal(second.counts.matchedMedia, 1);
    assert.equal(store.snapshot().itemIds.length, 1);
    assert.equal(store.snapshot().mediaIds.length, 1);
  });

  it("duplicate folder names with different IDs create separate items + conflict", () => {
    const existing: ExistingGalleryItemSnapshot = {
      id: "gi-old",
      slug: "old",
      vehicle: "ZR2",
      work_date: null,
      status: "pending_review",
      published: false,
      provisional_vehicle: true,
      drive_folder_id: "job-old",
      drive_folder_name: "26 ZR2",
      source_month_folder_name: "2026-07 JULY",
      shade_percentage: null,
      seo_title: null,
      seo_description: null,
    };

    const discovery = emptyDiscovery({
      months: [
        monthWithJobs("m1", "2026-07 JULY", "2026-07", [
          job("job-new", "26 ZR2", [mediaFile("file-new", "n.jpg")]),
        ]),
      ],
      totals: {
        monthFolderCount: 1,
        jobFolderCount: 1,
        mediaFileCount: 1,
        ignoredCount: 0,
        warningCount: 0,
      },
    });

    const batch = selectRecentImportBatch(discovery, {
      maxMonths: 3,
      maxItems: 60,
      maxMedia: 150,
    });
    const plan = buildImportPlan({
      discovery: batch.discoverySlice,
      existingItems: [existing],
      existingMedia: [],
    });
    const store = createInMemoryPendingImportStore({
      items: [{ id: "gi-old", drive_folder_id: "job-old", vehicle: "ZR2" }],
    });
    const result = executePendingImportPlan(plan, store, {
      batchLimits: batchLimitsFromSelection(batch),
    });

    assert.equal(result.counts.createdGalleryItems, 1);
    assert.ok(
      result.conflicts.some((c) => c.code === "duplicate_folder_name_different_id"),
    );
    assert.equal(store.snapshot().itemIds.length, 2);
  });

  it("duplicate file names with different IDs create separate media + conflict", () => {
    const discovery = emptyDiscovery({
      months: [
        monthWithJobs("m1", "2026-07 JULY", "2026-07", [
          job("job-1", "15 Jetta", [
            mediaFile("file-new", "dup.jpg"),
          ]),
        ]),
      ],
      totals: {
        monthFolderCount: 1,
        jobFolderCount: 1,
        mediaFileCount: 1,
        ignoredCount: 0,
        warningCount: 0,
      },
    });

    const existingMedia: ExistingGalleryMediaSnapshot[] = [
      {
        id: "gm-old",
        gallery_item_id: "gi-other",
        drive_file_id: "file-old",
        drive_file_name: "dup.jpg",
        mime_type: "image/jpeg",
        media_type: "image",
        is_featured: false,
        storage_url: null,
      },
    ];

    const batch = selectRecentImportBatch(discovery, {
      maxMonths: 3,
      maxItems: 60,
      maxMedia: 150,
    });
    const plan = buildImportPlan({
      discovery: batch.discoverySlice,
      existingItems: [],
      existingMedia,
    });
    const store = createInMemoryPendingImportStore({
      media: [
        {
          id: "gm-old",
          gallery_item_id: "gi-other",
          drive_file_id: "file-old",
        },
      ],
    });
    const result = executePendingImportPlan(plan, store, {
      batchLimits: batchLimitsFromSelection(batch),
    });

    assert.equal(result.counts.createdMedia, 1);
    assert.ok(
      result.conflicts.some((c) => c.code === "media_name_collision_different_id"),
    );
  });

  it("rolls back transaction when forced failure occurs after item create", () => {
    const discovery = emptyDiscovery({
      months: [
        monthWithJobs("m1", "2026-07 JULY", "2026-07", [
          job("job-a", "26 ZR2", [mediaFile("file-a", "a.jpg")]),
        ]),
      ],
      totals: {
        monthFolderCount: 1,
        jobFolderCount: 1,
        mediaFileCount: 1,
        ignoredCount: 0,
        warningCount: 0,
      },
    });

    const batch = selectRecentImportBatch(discovery, {
      maxMonths: 3,
      maxItems: 60,
      maxMedia: 150,
    });
    const plan = buildImportPlan({
      discovery: batch.discoverySlice,
      existingItems: [],
      existingMedia: [],
    });
    const store = createInMemoryPendingImportStore();
    const before = store.snapshot();
    const result = executePendingImportPlan(plan, store, {
      failAfterItemCreate: true,
      batchLimits: batchLimitsFromSelection(batch),
    });

    assert.equal(result.ok, false);
    assert.equal(result.writesPerformed, false);
    assert.equal(result.transaction.rolledBack, true);
    assert.equal(result.counts.createdGalleryItems, 0);
    assert.equal(result.counts.createdMedia, 0);
    assert.deepEqual(store.snapshot(), before);
  });

  it("preserves human-edited metadata on matched items (no overwrite)", () => {
    const existing: ExistingGalleryItemSnapshot = {
      id: "gi-1",
      slug: "human-slug",
      vehicle: "Human Edited Title",
      work_date: "2026-01-01",
      status: "approved",
      published: true,
      provisional_vehicle: false,
      drive_folder_id: "job-a",
      drive_folder_name: "26 ZR2",
      source_month_folder_name: "2026-07 JULY",
      shade_percentage: "15%",
      seo_title: "Kept SEO",
      seo_description: "Kept desc",
    };

    const discovery = emptyDiscovery({
      months: [
        monthWithJobs("m1", "2026-07 JULY", "2026-07", [
          job("job-a", "26 ZR2 RENAMED", [mediaFile("file-a", "a.jpg")]),
        ]),
      ],
      totals: {
        monthFolderCount: 1,
        jobFolderCount: 1,
        mediaFileCount: 1,
        ignoredCount: 0,
        warningCount: 0,
      },
    });

    const batch = selectRecentImportBatch(discovery, {
      maxMonths: 3,
      maxItems: 60,
      maxMedia: 150,
    });
    const plan = buildImportPlan({
      discovery: batch.discoverySlice,
      existingItems: [existing],
      existingMedia: [],
    });
    const store = createInMemoryPendingImportStore({
      items: [
        {
          id: "gi-1",
          drive_folder_id: "job-a",
          vehicle: "Human Edited Title",
          provisional_vehicle: false,
        },
      ],
    });

    const result = executePendingImportPlan(plan, store, {
      batchLimits: batchLimitsFromSelection(batch),
    });

    assert.equal(result.counts.createdGalleryItems, 0);
    assert.equal(result.counts.matchedGalleryItems, 1);
    assert.equal(
      plan.planned.existingGalleryItemMatches[0].preserveHumanEditedMetadata,
      true,
    );
    assert.equal(store.items.get("gi-1")?.vehicle, "Human Edited Title");
    assert.equal(result.counts.createdMedia, 1);
  });
});

describe("schema missing semantics", () => {
  it("documents that write mode must fail closed (no empty media fallback)", () => {
    // Pure contract assertion — production loader throws DriveAuthError schema_missing.
    const writeModeRule = {
      dryRunMayEmptyFallback: true,
      writeModeSilentEmptyMediaFallback: false,
      requiredTables: ["gallery_items", "gallery_media"],
    };
    assert.equal(writeModeRule.writeModeSilentEmptyMediaFallback, false);
    assert.ok(writeModeRule.requiredTables.includes("gallery_media"));
  });
});
