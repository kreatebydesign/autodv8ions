import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  composeProvisionalWorkDate,
  normalizeProvisionalVehicleLabel,
  parseMonthFolder,
  parseVehicleFolder,
} from "./parse-drive-folder";
import {
  classifyMediaMime,
  compareMonthFoldersNewestFirst,
  determineImportScope,
  getRecentMonthKeys,
  inventoryDriveMedia,
  isMonthFolderInSyncRange,
} from "./validation";
import { getDefaultSyncOptions } from "./constants";

describe("parseMonthFolder", () => {
  it("parses 2026-07 JULY", () => {
    const parsed = parseMonthFolder("2026-07 JULY");
    assert.equal(parsed.ok, true);
    assert.equal(parsed.year, 2026);
    assert.equal(parsed.month, 7);
    assert.equal(parsed.sortKey, "2026-07");
    assert.equal(parsed.rawName, "2026-07 JULY");
  });

  it("parses single-digit month 2026-2 FEB", () => {
    const parsed = parseMonthFolder("2026-2 FEB");
    assert.equal(parsed.ok, true);
    assert.equal(parsed.month, 2);
    assert.equal(parsed.sortKey, "2026-02");
  });

  it("rejects malformed parent month", () => {
    const parsed = parseMonthFolder("July 2026");
    assert.equal(parsed.ok, false);
    assert.equal(parsed.year, null);
    assert.ok(parsed.warnings.some((w) => w.code === "month_unrecognized"));
  });

  it("rejects invalid month number", () => {
    const parsed = parseMonthFolder("2026-13 Weird");
    assert.equal(parsed.ok, false);
    assert.ok(parsed.warnings.some((w) => w.code === "month_invalid"));
  });
});

describe("parseVehicleFolder", () => {
  const july = parseMonthFolder("2026-07 JULY");
  const now = new Date("2026-07-11T12:00:00Z");

  it("preserves full name when month is malformed", () => {
    const bad = parseMonthFolder("not-a-month");
    const parsed = parseVehicleFolder("26 ZR2", bad, { now });
    assert.equal(parsed.vehicle, "26 ZR2");
    assert.equal(parsed.workDate, null);
  });
});

describe("compose and normalize helpers", () => {
  it("composes provisional work date", () => {
    const month = parseMonthFolder("2026-07 JULY");
    assert.equal(composeProvisionalWorkDate(month, 26), "2026-07-26");
    assert.equal(composeProvisionalWorkDate(month, 32), null);
  });

  it("normalizes vehicle label whitespace", () => {
    assert.equal(normalizeProvisionalVehicleLabel("  ZR2   Sport  "), "ZR2 Sport");
  });
});

describe("media recognition", () => {
  it("accepts jpeg/png/webp images", () => {
    assert.equal(classifyMediaMime("image/jpeg").validationStatus, "accepted");
    assert.equal(classifyMediaMime("image/png").mediaType, "image");
    assert.equal(classifyMediaMime("image/webp").validationStatus, "accepted");
  });

  it("inventories mp4/webm videos as needs_review", () => {
    const mp4 = classifyMediaMime("video/mp4");
    assert.equal(mp4.mediaType, "video");
    assert.equal(mp4.validationStatus, "needs_review");
  });

  it("flags quicktime for conversion/review", () => {
    const mov = classifyMediaMime("video/quicktime");
    assert.equal(mov.mediaType, "video");
    assert.equal(mov.validationStatus, "needs_review");
    assert.ok(mov.warnings.some((w) => w.code === "video_needs_conversion"));
  });

  it("marks single image as provisional featured", () => {
    const result = inventoryDriveMedia([
      {
        id: "1",
        name: "IMG_001.jpg",
        mimeType: "image/jpeg",
        createdTime: "2026-07-01T10:00:00Z",
      },
      {
        id: "2",
        name: "clip.mp4",
        mimeType: "video/mp4",
        createdTime: "2026-07-01T11:00:00Z",
      },
    ]);
    assert.equal(result.imageCount, 1);
    assert.equal(result.videoCount, 1);
    const featured = result.media.filter((m) => m.isFeatured);
    assert.equal(featured.length, 1);
    assert.equal(featured[0].mediaType, "image");
  });

  it("does not auto-feature when multiple images exist", () => {
    const result = inventoryDriveMedia([
      {
        id: "1",
        name: "a.jpg",
        mimeType: "image/jpeg",
        createdTime: "2026-07-01T10:00:00Z",
      },
      {
        id: "2",
        name: "b.jpg",
        mimeType: "image/jpeg",
        createdTime: "2026-07-01T09:00:00Z",
      },
    ]);
    assert.equal(result.media.every((m) => !m.isFeatured), true);
    assert.ok(result.warnings.some((w) => w.code === "featured_unconfirmed"));
  });
});

describe("import range / recency", () => {
  const now = new Date("2026-07-11T12:00:00Z");

  it("current-and-previous-month includes July and June 2026", () => {
    const options = getDefaultSyncOptions({
      mode: "current-and-previous-month",
      now,
    });
    assert.deepEqual(getRecentMonthKeys(now, true), ["2026-07", "2026-06"]);
    assert.equal(
      isMonthFolderInSyncRange(parseMonthFolder("2026-07 JULY"), options),
      true,
    );
    assert.equal(
      isMonthFolderInSyncRange(parseMonthFolder("2026-06 JUNE"), options),
      true,
    );
    assert.equal(
      isMonthFolderInSyncRange(parseMonthFolder("2025-04 April"), options),
      false,
    );
  });

  it("labels recent vs historical import scope", () => {
    const options = getDefaultSyncOptions({ now });
    assert.equal(
      determineImportScope(parseMonthFolder("2026-07 JULY"), options),
      "recent",
    );
    assert.equal(
      determineImportScope(parseMonthFolder("2025-04 April"), options),
      "historical",
    );
  });

  it("sorts month folders newest first", () => {
    const months = [
      parseMonthFolder("2025-04 April"),
      parseMonthFolder("2026-07 JULY"),
      parseMonthFolder("2026-06 JUNE"),
    ].sort(compareMonthFoldersNewestFirst);
    assert.equal(months[0].rawName, "2026-07 JULY");
    assert.equal(months[1].rawName, "2026-06 JUNE");
    assert.equal(months[2].rawName, "2025-04 April");
  });
});
