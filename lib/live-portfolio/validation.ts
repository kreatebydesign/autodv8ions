import {
  REVIEW_VIDEO_MIME_TYPES,
  SUPPORTED_IMAGE_MIME_TYPES,
  SUPPORTED_VIDEO_MIME_TYPES,
} from "./constants";
import type {
  DriveFileInventory,
  ImportScope,
  InventoriedMedia,
  MediaType,
  MediaValidationStatus,
  ParsedMonthFolder,
  PortfolioSyncOptions,
  ValidationWarning,
} from "./types";

function warn(code: string, message: string): ValidationWarning {
  return { code, message };
}

export function isSupportedImageMime(mimeType: string): boolean {
  const mime = (mimeType || "").toLowerCase();
  return (SUPPORTED_IMAGE_MIME_TYPES as readonly string[]).includes(mime);
}

export function isSupportedVideoMime(mimeType: string): boolean {
  const mime = (mimeType || "").toLowerCase();
  return (SUPPORTED_VIDEO_MIME_TYPES as readonly string[]).includes(mime);
}

export function isReviewVideoMime(mimeType: string): boolean {
  const mime = (mimeType || "").toLowerCase();
  return (REVIEW_VIDEO_MIME_TYPES as readonly string[]).includes(mime);
}

export function classifyMediaMime(mimeType: string): {
  mediaType: MediaType | null;
  validationStatus: MediaValidationStatus;
  rejectedReason: string | null;
  warnings: ValidationWarning[];
} {
  const mime = (mimeType || "").toLowerCase();
  const warnings: ValidationWarning[] = [];

  if (isSupportedImageMime(mime)) {
    return {
      mediaType: "image",
      validationStatus: "accepted",
      rejectedReason: null,
      warnings,
    };
  }

  if (isSupportedVideoMime(mime)) {
    return {
      mediaType: "video",
      validationStatus: "needs_review",
      rejectedReason: null,
      warnings: [
        warn(
          "video_inventory_only",
          "Video inventoried for a later phase; not published or featured in Phase 0.",
        ),
      ],
    };
  }

  if (isReviewVideoMime(mime)) {
    return {
      mediaType: "video",
      validationStatus: "needs_review",
      rejectedReason: null,
      warnings: [
        warn(
          "video_needs_conversion",
          "QuickTime/MOV inventoried but requires conversion or review before public use.",
        ),
      ],
    };
  }

  if (mime.startsWith("image/")) {
    return {
      mediaType: "image",
      validationStatus: "rejected",
      rejectedReason: `Unsupported image mime type: ${mime}`,
      warnings: [
        warn("unsupported_image", `Unsupported image mime type: ${mime}`),
      ],
    };
  }

  if (mime.startsWith("video/")) {
    return {
      mediaType: "video",
      validationStatus: "rejected",
      rejectedReason: `Unsupported video mime type: ${mime}`,
      warnings: [
        warn("unsupported_video", `Unsupported video mime type: ${mime}`),
      ],
    };
  }

  return {
    mediaType: null,
    validationStatus: "rejected",
    rejectedReason: `Unsupported file mime type: ${mime || "(empty)"}`,
    warnings: [
      warn(
        "unsupported_file",
        `Unsupported file mime type: ${mime || "(empty)"}`,
      ),
    ],
  };
}

function parseBytes(size: string | number | null | undefined): number | null {
  if (size == null || size === "") return null;
  const n = typeof size === "number" ? size : Number.parseInt(String(size), 10);
  return Number.isFinite(n) ? n : null;
}

function timeValue(value?: string | null): number {
  if (!value) return 0;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : 0;
}

/**
 * Deterministic sort: created time → modified time → filename.
 * Newest first for created/modified when available; filename A→Z as tiebreaker.
 */
export function compareDriveFilesForSort(
  a: DriveFileInventory,
  b: DriveFileInventory,
): number {
  const createdDiff = timeValue(b.createdTime) - timeValue(a.createdTime);
  if (createdDiff !== 0) return createdDiff;

  const modifiedDiff = timeValue(b.modifiedTime) - timeValue(a.modifiedTime);
  if (modifiedDiff !== 0) return modifiedDiff;

  return (a.name || "").localeCompare(b.name || "", undefined, {
    sensitivity: "base",
    numeric: true,
  });
}

/**
 * Inventory media metadata only. No downloads. No Drive public URLs.
 * Featured: only when exactly one accepted image exists.
 */
export function inventoryDriveMedia(
  files: DriveFileInventory[],
): {
  media: InventoriedMedia[];
  warnings: ValidationWarning[];
  imageCount: number;
  videoCount: number;
} {
  const warnings: ValidationWarning[] = [];
  const sorted = [...files].sort(compareDriveFilesForSort);

  const media: InventoriedMedia[] = sorted.map((file, index) => {
    const classified = classifyMediaMime(file.mimeType || "");
    warnings.push(...classified.warnings);

    return {
      driveFileId: file.id,
      driveFileName: file.name || "",
      driveCreatedAt: file.createdTime || null,
      driveModifiedAt: file.modifiedTime || null,
      mimeType: file.mimeType || "",
      mediaType: classified.mediaType,
      bytes: parseBytes(file.size),
      sortOrder: index,
      isFeatured: false,
      validationStatus: classified.validationStatus,
      rejectedReason: classified.rejectedReason,
      warnings: classified.warnings,
    };
  });

  const acceptedImages = media.filter(
    (m) => m.mediaType === "image" && m.validationStatus === "accepted",
  );

  if (acceptedImages.length === 1) {
    acceptedImages[0].isFeatured = true;
    warnings.push(
      warn(
        "single_image_provisional_featured",
        "Exactly one valid image found; marked provisionally featured pending admin approval.",
      ),
    );
  } else if (acceptedImages.length > 1) {
    warnings.push(
      warn(
        "featured_unconfirmed",
        "Multiple images found; featured media left unconfirmed for admin selection.",
      ),
    );
  } else if (acceptedImages.length === 0) {
    warnings.push(
      warn("no_valid_images", "No supported images found in this folder."),
    );
  }

  const imageCount = media.filter((m) => m.mediaType === "image").length;
  const videoCount = media.filter((m) => m.mediaType === "video").length;

  return { media, warnings, imageCount, videoCount };
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function parseIsoDate(value?: string | null): Date | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const d = new Date(
    Date.UTC(
      Number.parseInt(match[1], 10),
      Number.parseInt(match[2], 10) - 1,
      Number.parseInt(match[3], 10),
    ),
  );
  return Number.isNaN(d.getTime()) ? null : d;
}

export function getRecentMonthKeys(
  now: Date,
  includePrevious: boolean,
): string[] {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const keys = [monthKey(year, month)];
  if (includePrevious) {
    const prev = new Date(Date.UTC(year, month - 2, 1));
    keys.push(monthKey(prev.getUTCFullYear(), prev.getUTCMonth() + 1));
  }
  return keys;
}

/**
 * Whether a parsed month folder is in the active sync window.
 */
export function isMonthFolderInSyncRange(
  month: ParsedMonthFolder,
  options: PortfolioSyncOptions,
): boolean {
  if (!month.ok || month.year == null || month.month == null) return false;

  const key = monthKey(month.year, month.month);
  const now = options.now || new Date();

  if (options.mode === "current-month-only") {
    return getRecentMonthKeys(now, false).includes(key);
  }

  if (options.mode === "current-and-previous-month") {
    return getRecentMonthKeys(now, true).includes(key);
  }

  if (options.mode === "historical-backfill" || options.mode === "date-range") {
    const start = parseIsoDate(options.startDate || null);
    const end = parseIsoDate(options.endDate || null);
    const folderStart = new Date(Date.UTC(month.year, month.month - 1, 1));
    const folderEnd = new Date(Date.UTC(month.year, month.month, 0));

    if (start && folderEnd < start) return false;
    if (end && folderStart > end) return false;

    if (options.mode === "historical-backfill") {
      // Historical mode excludes the current+previous recent window unless
      // an explicit start/end forces inclusion.
      const recent = getRecentMonthKeys(now, true);
      if (recent.includes(key) && !options.startDate && !options.endDate) {
        return false;
      }
    }

    return true;
  }

  // all-controlled: honor optional date bounds only
  const start = parseIsoDate(options.startDate || null);
  const end = parseIsoDate(options.endDate || null);
  const folderStart = new Date(Date.UTC(month.year, month.month - 1, 1));
  const folderEnd = new Date(Date.UTC(month.year, month.month, 0));
  if (start && folderEnd < start) return false;
  if (end && folderStart > end) return false;
  return true;
}

export function determineImportScope(
  month: ParsedMonthFolder,
  options: PortfolioSyncOptions,
): ImportScope {
  const now = options.now || new Date();
  if (
    month.ok &&
    month.year != null &&
    month.month != null &&
    getRecentMonthKeys(now, true).includes(
      monthKey(month.year, month.month),
    )
  ) {
    return "recent";
  }
  return "historical";
}

export function compareMonthFoldersNewestFirst(
  a: ParsedMonthFolder,
  b: ParsedMonthFolder,
): number {
  if (a.ok && b.ok && a.year != null && b.year != null && a.month != null && b.month != null) {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  }
  if (a.ok !== b.ok) return a.ok ? -1 : 1;
  return a.rawName.localeCompare(b.rawName);
}
