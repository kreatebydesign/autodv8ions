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
    assert.equal(parsed.rawName, "2026-07 JULY");
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

  it("parses 26 ZR2 as day + vehicle + work_date", () => {
    const parsed = parseVehicleFolder("26 ZR2", july);
    assert.equal(parsed.day, 26);
    assert.equal(parsed.vehicle, "ZR2");
    assert.equal(parsed.workDate, "2026-07-26");
    assert.equal(parsed.rawName, "26 ZR2");
    assert.equal(parsed.provisionalVehicle, true);
  });

  it("parses 15 Jetta", () => {
    const parsed = parseVehicleFolder("15 Jetta", july);
    assert.equal(parsed.day, 15);
    assert.equal(parsed.vehicle, "Jetta");
    assert.equal(parsed.workDate, "2026-07-15");
  });

  it("does not treat 2011 F250 as a day", () => {
    const parsed = parseVehicleFolder("2011 F250", july);
    assert.equal(parsed.day, null);
    assert.equal(parsed.vehicle, "2011 F250");
    assert.equal(parsed.workDate, null);
    assert.ok(parsed.warnings.some((w) => w.code === "year_like_prefix"));
  });

  it("leaves Corvette without a day", () => {
    const parsed = parseVehicleFolder("Corvette", july);
    assert.equal(parsed.day, null);
    assert.equal(parsed.vehicle, "Corvette");
    assert.equal(parsed.workDate, null);
    assert.ok(parsed.warnings.some((w) => w.code === "no_day_prefix"));
  });

  it("does not treat impossible day 32 as a day", () => {
    const parsed = parseVehicleFolder("32 Mystery", july);
    assert.equal(parsed.day, null);
    assert.equal(parsed.vehicle, "32 Mystery");
    assert.equal(parsed.workDate, null);
    assert.ok(parsed.warnings.some((w) => w.code === "day_impossible"));
  });

  it("handles empty vehicle after numeric prefix", () => {
    const parsed = parseVehicleFolder("26", july);
    assert.equal(parsed.day, 26);
    assert.equal(parsed.vehicle, "");
    assert.equal(parsed.workDate, "2026-07-26");
    assert.ok(parsed.warnings.some((w) => w.code === "vehicle_empty_after_day"));
  });

  it("respects February non-leap year", () => {
    const feb = parseMonthFolder("2025-02 February");
    const parsed = parseVehicleFolder("29 Camry", feb);
    assert.equal(parsed.day, null);
    assert.equal(parsed.vehicle, "29 Camry");
    assert.equal(parsed.workDate, null);
    assert.ok(parsed.warnings.some((w) => w.code === "day_impossible"));
  });

  it("allows February 29 on leap year", () => {
    const feb = parseMonthFolder("2024-02 February");
    const parsed = parseVehicleFolder("29 Camry", feb);
    assert.equal(parsed.day, 29);
    assert.equal(parsed.vehicle, "Camry");
    assert.equal(parsed.workDate, "2024-02-29");
  });

  it("preserves full name when month is malformed", () => {
    const bad = parseMonthFolder("not-a-month");
    const parsed = parseVehicleFolder("26 ZR2", bad);
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
