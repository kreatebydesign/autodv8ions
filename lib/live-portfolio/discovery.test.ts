import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyDiscoveryMedia,
  compareDiscoveryFilesNewestFirst,
} from "./discovery-classify";
import { DISCOVERY_LIMITS } from "./discovery-types";
import {
  buildMonthSortKey,
  parseMonthFolder,
} from "./parse-drive-folder";
import { compareMonthFoldersNewestFirst } from "./validation";
import { buildDriveDiscoveryPreview } from "@/lib/google/drive-discovery";
import type { DriveDiscoveryResult } from "./discovery-types";

describe("month parsing for discovery", () => {
  it("parses padded and unpadded month folders", () => {
    const july = parseMonthFolder("2026-07 JULY");
    assert.equal(july.ok, true);
    assert.equal(july.year, 2026);
    assert.equal(july.month, 7);
    assert.equal(july.sortKey, "2026-07");

    const feb = parseMonthFolder("2026-2 FEB");
    assert.equal(feb.ok, true);
    assert.equal(feb.month, 2);
    assert.equal(feb.sortKey, "2026-02");

    const april = parseMonthFolder("2026-04 APRIL");
    assert.equal(april.sortKey, "2026-04");
  });

  it("handles malformed month folders without inventing values", () => {
    const bad = parseMonthFolder("July 2026");
    assert.equal(bad.ok, false);
    assert.equal(bad.sortKey, null);
    assert.ok(bad.warnings.some((w) => w.code === "month_unrecognized"));
  });

  it("sorts months newest first by sortKey", () => {
    const months = [
      parseMonthFolder("2026-2 FEB"),
      parseMonthFolder("2026-07 JULY"),
      parseMonthFolder("2026-06 JUNE"),
      parseMonthFolder("not-a-month"),
    ].sort(compareMonthFoldersNewestFirst);

    assert.equal(months[0].sortKey, "2026-07");
    assert.equal(months[1].sortKey, "2026-06");
    assert.equal(months[2].sortKey, "2026-02");
    assert.equal(months[3].ok, false);
    assert.equal(buildMonthSortKey(2026, 2), "2026-02");
  });
});

describe("discovery media classification", () => {
  it("accepts supported image and video MIME types", () => {
    assert.equal(
      classifyDiscoveryMedia({
        id: "1",
        name: "a.jpg",
        mimeType: "image/jpeg",
      }).accepted,
      true,
    );
    assert.equal(
      classifyDiscoveryMedia({
        id: "2",
        name: "b.heic",
        mimeType: "image/heic",
      }).accepted,
      true,
    );
    assert.equal(
      classifyDiscoveryMedia({
        id: "3",
        name: "c.mov",
        mimeType: "video/quicktime",
      }).accepted,
      true,
    );
  });

  it("ignores unsupported and system files with reasons", () => {
    const pdf = classifyDiscoveryMedia({
      id: "1",
      name: "quote.pdf",
      mimeType: "application/pdf",
    });
    assert.equal(pdf.accepted, false);
    if (!pdf.accepted) assert.equal(pdf.reason, "pdf");

    const docs = classifyDiscoveryMedia({
      id: "2",
      name: "Notes",
      mimeType: "application/vnd.google-apps.document",
    });
    assert.equal(docs.accepted, false);
    if (!docs.accepted) assert.equal(docs.reason, "google_workspace_file");

    const hidden = classifyDiscoveryMedia({
      id: "3",
      name: ".DS_Store",
      mimeType: "text/plain",
    });
    assert.equal(hidden.accepted, false);
    if (!hidden.accepted) assert.equal(hidden.reason, "hidden_or_system");

    const thumb = classifyDiscoveryMedia({
      id: "4",
      name: "IMG_thumb.jpg",
      mimeType: "image/jpeg",
    });
    assert.equal(thumb.accepted, false);
    if (!thumb.accepted) assert.equal(thumb.reason, "thumbnail_like");

    const zip = classifyDiscoveryMedia({
      id: "5",
      name: "set.zip",
      mimeType: "application/zip",
    });
    assert.equal(zip.accepted, false);
    if (!zip.accepted) assert.equal(zip.reason, "archive");
  });

  it("sorts media newest first", () => {
    const sorted = [
      { name: "old.jpg", createdTime: "2026-01-01T00:00:00Z" },
      { name: "new.jpg", createdTime: "2026-07-01T00:00:00Z" },
    ].sort(compareDiscoveryFilesNewestFirst);
    assert.equal(sorted[0].name, "new.jpg");
  });
});

describe("discovery preview shaping", () => {
  it("returns zero-result preview cleanly", () => {
    const empty: DriveDiscoveryResult = {
      authMode: "wif",
      sourceFolderId: "root",
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
    };

    const preview = buildDriveDiscoveryPreview(empty);
    assert.equal(preview.ok, true);
    assert.equal(preview.monthFolderCount, 0);
    assert.equal(preview.months.length, 0);
    assert.equal(preview.mediaFileCount, 0);
  });

  it("respects sample truncation limits", () => {
    const manyJobs = Array.from({ length: 10 }, (_, i) => ({
      folderId: `job-${i}`,
      folderName: `Job ${i}`,
      createdTime: null,
      media: Array.from({ length: 5 }, (_, j) => ({
        fileId: `m-${i}-${j}`,
        fileName: `file-${j}.jpg`,
        mimeType: "image/jpeg",
        extension: "jpg",
        mediaKind: "image" as const,
        createdTime: null,
        modifiedTime: null,
        webViewLink: null,
      })),
      ignored: [],
      warnings: [],
      mediaTruncated: false,
    }));

    const result: DriveDiscoveryResult = {
      authMode: "wif",
      sourceFolderId: "root",
      sourceFolderName: "Tint Jobs",
      months: [
        {
          folderId: "m1",
          folderName: "2026-07 JULY",
          year: 2026,
          month: 7,
          sortKey: "2026-07",
          parseOk: true,
          createdTime: null,
          jobs: manyJobs,
          ignored: [],
          warnings: [],
          jobsTruncated: true,
        },
      ],
      totals: {
        monthFolderCount: 1,
        jobFolderCount: 10,
        mediaFileCount: 50,
        ignoredCount: 0,
        warningCount: 0,
      },
      truncated: { months: false, jobs: true, media: false },
      warnings: [],
      ignored: [],
    };

    const preview = buildDriveDiscoveryPreview(result);
    assert.equal(preview.months.length, 1);
    assert.ok(
      preview.months[0].sampleJobs.length <= DISCOVERY_LIMITS.sampleJobsPerMonth,
    );
    assert.ok(
      preview.months[0].sampleJobs[0].sampleMedia.length <=
        DISCOVERY_LIMITS.sampleMediaPerJob,
    );
    assert.equal(preview.truncated.jobs, true);
  });
});
