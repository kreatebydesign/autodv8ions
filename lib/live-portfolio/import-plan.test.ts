import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DriveDiscoveryResult } from "./discovery-types";
import {
  buildCandidateMetadata,
  buildImportPlan,
  buildImportPlanPreview,
  buildSlugCandidate,
} from "./import-plan";
import type {
  ExistingGalleryItemSnapshot,
  ExistingGalleryMediaSnapshot,
} from "./import-plan-types";

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

describe("import plan matching", () => {
  it("returns a zero-result plan cleanly", () => {
    const plan = buildImportPlan({
      discovery: emptyDiscovery(),
      existingItems: [],
      existingMedia: [],
    });
    assert.equal(plan.writesPerformed, false);
    assert.equal(plan.totals.newGalleryItemCount, 0);
    assert.equal(plan.totals.existingGalleryItemMatchCount, 0);
    const preview = buildImportPlanPreview(plan);
    assert.equal(preview.writesPerformed, false);
    assert.match(preview.guarantee, /No database writes/i);
  });

  it("plans new items as pending-only with no public media", () => {
    const discovery = emptyDiscovery({
      months: [
        {
          folderId: "month-1",
          folderName: "2026-07 JULY",
          year: 2026,
          month: 7,
          sortKey: "2026-07",
          parseOk: true,
          createdTime: null,
          jobs: [
            {
              folderId: "job-zr2",
              folderName: "26 ZR2",
              createdTime: null,
              media: [
                {
                  fileId: "file-1",
                  fileName: "IMG_1.jpg",
                  mimeType: "image/jpeg",
                  extension: "jpg",
                  mediaKind: "image",
                  createdTime: null,
                  modifiedTime: null,
                  webViewLink: null,
                },
              ],
              ignored: [],
              warnings: [],
              mediaTruncated: false,
            },
          ],
          ignored: [],
          warnings: [],
          jobsTruncated: false,
        },
      ],
      totals: {
        monthFolderCount: 1,
        jobFolderCount: 1,
        mediaFileCount: 1,
        ignoredCount: 0,
        warningCount: 0,
      },
    });

    const plan = buildImportPlan({
      discovery,
      existingItems: [],
      existingMedia: [],
    });

    assert.equal(plan.totals.newGalleryItemCount, 1);
    assert.equal(plan.totals.newGalleryMediaCount, 1);
    const item = plan.planned.newGalleryItems[0];
    assert.equal(item.defaults.status, "pending_review");
    assert.equal(item.defaults.published, false);
    assert.equal(item.defaults.featured, false);
    assert.equal(item.defaults.homepageVisible, false);
    assert.equal(item.defaults.publicMediaUrl, null);
    assert.equal(item.metadata.vehicleLabelCandidate, "26 ZR2");
    assert.equal(item.metadata.workDateCandidate, null);
    assert.equal(plan.planned.newGalleryMedia[0].defaults.storageUrl, null);
    assert.equal(plan.planned.newGalleryMedia[0].defaults.isFeatured, false);
  });

  it("matches existing gallery items by drive_folder_id, not name", () => {
    const existing: ExistingGalleryItemSnapshot = {
      id: "gi-1",
      slug: "old-slug",
      vehicle: "Human Edited Title",
      work_date: "2026-07-01",
      status: "approved",
      published: true,
      provisional_vehicle: false,
      drive_folder_id: "job-zr2",
      drive_folder_name: "26 ZR2",
      source_month_folder_name: "2026-07 JULY",
      shade_percentage: "15%",
      seo_title: "Kept",
      seo_description: "Kept",
    };

    const discovery = emptyDiscovery({
      months: [
        {
          folderId: "month-1",
          folderName: "2026-07 JULY",
          year: 2026,
          month: 7,
          sortKey: "2026-07",
          parseOk: true,
          createdTime: null,
          jobs: [
            {
              folderId: "job-zr2",
              folderName: "26 ZR2",
              createdTime: null,
              media: [],
              ignored: [],
              warnings: [],
              mediaTruncated: false,
            },
          ],
          ignored: [],
          warnings: [],
          jobsTruncated: false,
        },
      ],
      totals: {
        monthFolderCount: 1,
        jobFolderCount: 1,
        mediaFileCount: 0,
        ignoredCount: 0,
        warningCount: 0,
      },
    });

    const plan = buildImportPlan({
      discovery,
      existingItems: [existing],
      existingMedia: [],
    });

    assert.equal(plan.totals.newGalleryItemCount, 0);
    assert.equal(plan.totals.existingGalleryItemMatchCount, 1);
    assert.equal(
      plan.planned.existingGalleryItemMatches[0].preserveHumanEditedMetadata,
      true,
    );
    assert.equal(
      plan.planned.existingGalleryItemMatches[0].existing.vehicle,
      "Human Edited Title",
    );
  });

  it("treats duplicate folder names with different Drive IDs as conflicts", () => {
    const existing: ExistingGalleryItemSnapshot = {
      id: "gi-old",
      slug: "slug-old",
      vehicle: "ZR2",
      work_date: null,
      status: "pending_review",
      published: false,
      provisional_vehicle: true,
      drive_folder_id: "job-old-id",
      drive_folder_name: "26 ZR2",
      source_month_folder_name: "2026-07 JULY",
      shade_percentage: null,
      seo_title: null,
      seo_description: null,
    };

    const discovery = emptyDiscovery({
      months: [
        {
          folderId: "month-1",
          folderName: "2026-07 JULY",
          year: 2026,
          month: 7,
          sortKey: "2026-07",
          parseOk: true,
          createdTime: null,
          jobs: [
            {
              folderId: "job-new-id",
              folderName: "26 ZR2",
              createdTime: null,
              media: [],
              ignored: [],
              warnings: [],
              mediaTruncated: false,
            },
          ],
          ignored: [],
          warnings: [],
          jobsTruncated: false,
        },
      ],
      totals: {
        monthFolderCount: 1,
        jobFolderCount: 1,
        mediaFileCount: 0,
        ignoredCount: 0,
        warningCount: 0,
      },
    });

    const plan = buildImportPlan({
      discovery,
      existingItems: [existing],
      existingMedia: [],
    });

    assert.equal(plan.totals.newGalleryItemCount, 1);
    assert.ok(
      plan.planned.conflicts.some(
        (c) => c.code === "duplicate_folder_name_different_id",
      ),
    );
  });

  it("matches media by drive_file_id and flags same-name different-id conflicts", () => {
    const existingMedia: ExistingGalleryMediaSnapshot[] = [
      {
        id: "gm-1",
        gallery_item_id: "gi-1",
        drive_file_id: "file-existing",
        drive_file_name: "shot.jpg",
        mime_type: "image/jpeg",
        media_type: "image",
        is_featured: true,
        storage_url: "https://example.com/kept.jpg",
      },
      {
        id: "gm-2",
        gallery_item_id: "gi-1",
        drive_file_id: "file-other-id",
        drive_file_name: "dup-name.jpg",
        mime_type: "image/jpeg",
        media_type: "image",
        is_featured: false,
        storage_url: null,
      },
    ];

    const discovery = emptyDiscovery({
      months: [
        {
          folderId: "month-1",
          folderName: "2026-07 JULY",
          year: 2026,
          month: 7,
          sortKey: "2026-07",
          parseOk: true,
          createdTime: null,
          jobs: [
            {
              folderId: "job-1",
              folderName: "15 Jetta",
              createdTime: null,
              media: [
                {
                  fileId: "file-existing",
                  fileName: "shot.jpg",
                  mimeType: "image/jpeg",
                  extension: "jpg",
                  mediaKind: "image",
                  createdTime: null,
                  modifiedTime: null,
                  webViewLink: null,
                },
                {
                  fileId: "file-brand-new",
                  fileName: "dup-name.jpg",
                  mimeType: "image/jpeg",
                  extension: "jpg",
                  mediaKind: "image",
                  createdTime: null,
                  modifiedTime: null,
                  webViewLink: null,
                },
              ],
              ignored: [],
              warnings: [],
              mediaTruncated: false,
            },
          ],
          ignored: [],
          warnings: [],
          jobsTruncated: false,
        },
      ],
      totals: {
        monthFolderCount: 1,
        jobFolderCount: 1,
        mediaFileCount: 2,
        ignoredCount: 0,
        warningCount: 0,
      },
    });

    const plan = buildImportPlan({
      discovery,
      existingItems: [],
      existingMedia,
    });

    assert.equal(plan.totals.existingGalleryMediaMatchCount, 1);
    assert.equal(plan.totals.newGalleryMediaCount, 1);
    assert.equal(
      plan.planned.existingGalleryMediaMatches[0].preserveFeaturedAndStorage,
      true,
    );
    assert.ok(
      plan.planned.conflicts.some(
        (c) => c.code === "media_name_collision_different_id",
      ),
    );
  });

  it("records malformed month folders without inventing details", () => {
    const discovery = emptyDiscovery({
      months: [
        {
          folderId: "month-bad",
          folderName: "Random Photos",
          year: null,
          month: null,
          sortKey: null,
          parseOk: false,
          createdTime: null,
          jobs: [
            {
              folderId: "job-corvette",
              folderName: "Corvette",
              createdTime: null,
              media: [],
              ignored: [],
              warnings: [],
              mediaTruncated: false,
            },
          ],
          ignored: [],
          warnings: [
            {
              code: "month_unrecognized",
              message: "unrecognized",
            },
          ],
          jobsTruncated: false,
        },
      ],
      totals: {
        monthFolderCount: 1,
        jobFolderCount: 1,
        mediaFileCount: 0,
        ignoredCount: 0,
        warningCount: 1,
      },
    });

    const plan = buildImportPlan({
      discovery,
      existingItems: [],
      existingMedia: [],
    });

    assert.ok(plan.totals.malformedCount >= 1);
    assert.equal(plan.totals.newGalleryItemCount, 1);
    assert.equal(
      plan.planned.newGalleryItems[0].metadata.vehicleLabelCandidate,
      "Corvette",
    );
    assert.equal(
      plan.planned.newGalleryItems[0].metadata.workDateCandidate,
      null,
    );
  });

  it("builds stable slug candidates from Drive folder ID", () => {
    const a = buildSlugCandidate("ZR2", "2026-07-26", "abcdef123456");
    const b = buildSlugCandidate("ZR2", "2026-07-26", "zzzzzz999999");
    assert.notEqual(a, b);
    assert.match(a, /zr2/);
    assert.match(a, /abcdef12/);
  });

  it("candidate metadata uses folder name only", () => {
    const meta = buildCandidateMetadata({
      jobFolderId: "id-1",
      jobFolderName: "26 ZR2",
      monthFolderId: "m1",
      monthFolderName: "2026-07 JULY",
      year: 2026,
      month: 7,
      sortKey: "2026-07",
    });
    assert.equal(meta.displayTitleCandidate, "26 ZR2");
    assert.equal(meta.provisionalVehicle, true);
    assert.doesNotMatch(meta.displayTitleCandidate, /customer/i);
  });
});
