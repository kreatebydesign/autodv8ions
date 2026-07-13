import { google, type drive_v3 } from "googleapis";
import {
  DriveAuthError,
  getDriveAuthClientViaWif,
  getDriveAuthMode,
  hasDriveFolderTarget,
  isGoogleDriveOAuthLegacyConfigured,
  isGoogleDriveWifConfigured,
  sanitizeErrorMessage,
} from "@/lib/google/auth-drive";
import {
  PORTFOLIO_SERVICE_TYPE,
  RAW_CONTENT_FOLDER_NAMES,
  TINT_JOBS_FOLDER_NAMES,
  syncOptionsFromEnv,
} from "@/lib/live-portfolio/constants";
import {
  normalizeProvisionalVehicleLabel,
  parseMonthFolder,
  parseVehicleFolder,
} from "@/lib/live-portfolio/parse-drive-folder";
import type {
  DriveFileInventory,
  PortfolioSyncOptions,
  ValidationWarning,
} from "@/lib/live-portfolio/types";
import {
  compareMonthFoldersNewestFirst,
  determineImportScope,
  inventoryDriveMedia,
  isMonthFolderInSyncRange,
} from "@/lib/live-portfolio/validation";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils/format";

type DriveClient = drive_v3.Drive;

export type PortfolioSyncResult = {
  success: boolean;
  mode: PortfolioSyncOptions["mode"];
  maxFolders: number;
  tintJobsFolderId: string | null;
  scannedMonthFolders: number;
  importedFolders: number;
  skippedFolders: number;
  warnings: ValidationWarning[];
  items: Array<{
    driveFolderId: string;
    driveFolderName: string;
    vehicle: string;
    workDate: string | null;
    status: string;
    importScope: string | null;
    imageCount: number;
    videoCount: number;
    warningCount: number;
  }>;
};

export function isGoogleDriveConfigured() {
  return getDriveAuthMode() !== "none";
}

/** Legacy OAuth refresh-token client — fallback only when WIF is unavailable. */
function getLegacyOAuthClient() {
  if (!isGoogleDriveOAuthLegacyConfigured()) {
    throw new DriveAuthError(
      "oauth_legacy_unavailable",
      "Legacy Google Drive OAuth is not configured.",
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN!;

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

/**
 * Prefer Vercel OIDC → GCP Workload Identity Federation.
 * Fall back to legacy OAuth only when WIF env is incomplete.
 */
export async function getDriveAuthClient() {
  if (isGoogleDriveWifConfigured()) {
    // googleapis nests a different google-auth-library build; cast at the boundary.
    return (await getDriveAuthClientViaWif()) as never;
  }

  if (isGoogleDriveOAuthLegacyConfigured() && hasDriveFolderTarget()) {
    return getLegacyOAuthClient();
  }

  throw new DriveAuthError(
    "drive_not_configured",
    "Google Drive is not configured. Set GCP_* Workload Identity variables (preferred) or legacy OAuth vars.",
  );
}

export type DriveConnectionCheckResult = {
  configured: boolean;
  authenticated: boolean;
  authMode: ReturnType<typeof getDriveAuthMode>;
  rootFolderName: string | null;
  immediateFolderCount: number;
  sampleFolderNames: string[];
  error?: { code: string; message: string };
};

/**
 * Production-safe auth verification only.
 * Lists Tint Jobs folder metadata + a few child folder names.
 * No DB writes, no sync, no media downloads, no Drive URLs returned.
 */
export async function checkDriveConnection(): Promise<DriveConnectionCheckResult> {
  const authMode = getDriveAuthMode();
  const base: DriveConnectionCheckResult = {
    configured: authMode !== "none",
    authenticated: false,
    authMode,
    rootFolderName: null,
    immediateFolderCount: 0,
    sampleFolderNames: [],
  };

  if (authMode === "none") {
    return {
      ...base,
      error: {
        code: "drive_not_configured",
        message:
          "Drive is not configured. Required: GCP Workload Identity variables and GOOGLE_DRIVE_TINT_JOBS_FOLDER_ID.",
      },
    };
  }

  try {
    const auth = await getDriveAuthClient();
    const drive = google.drive({ version: "v3", auth });

    const resolved = await resolveTintJobsFolderId(drive);
    if (!resolved.folderId) {
      return {
        ...base,
        authenticated: true,
        error: {
          code: "tint_jobs_not_found",
          message:
            "Authenticated, but the Tint Jobs folder could not be resolved. Check GOOGLE_DRIVE_TINT_JOBS_FOLDER_ID.",
        },
      };
    }

    const { data: root } = await drive.files.get({
      fileId: resolved.folderId,
      fields: "id,name,mimeType",
      supportsAllDrives: true,
    });

    const children = await listChildFolders(drive, resolved.folderId);
    const sampleFolderNames = children
      .map((folder) => folder.name || "")
      .filter(Boolean)
      .slice(0, 5);

    return {
      configured: true,
      authenticated: true,
      authMode,
      rootFolderName: root.name || null,
      immediateFolderCount: children.length,
      sampleFolderNames,
    };
  } catch (error) {
    if (error instanceof DriveAuthError) {
      return {
        ...base,
        error: { code: error.code, message: error.message },
      };
    }

    return {
      ...base,
      error: {
        code: "drive_check_failed",
        message: sanitizeErrorMessage(
          error instanceof Error ? error.message : "Drive connection check failed.",
        ),
      },
    };
  }
}

function normalizeFolderName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function nameMatches(name: string | null | undefined, candidates: readonly string[]) {
  if (!name) return false;
  const normalized = normalizeFolderName(name);
  return candidates.some((candidate) => normalizeFolderName(candidate) === normalized);
}

async function listChildFolders(drive: DriveClient, parentId: string) {
  const { data } = await drive.files.list({
    q: `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id,name,createdTime)",
    pageSize: 200,
    orderBy: "name desc",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  return data.files || [];
}

async function listChildFiles(drive: DriveClient, parentId: string) {
  const { data } = await drive.files.list({
    q: `'${parentId}' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false`,
    fields:
      "files(id,name,mimeType,createdTime,modifiedTime,size)",
    pageSize: 200,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  return data.files || [];
}

/**
 * Resolve Tint Jobs folder without requiring a second approved tree.
 * Preference:
 * 1. GOOGLE_DRIVE_TINT_JOBS_FOLDER_ID
 * 2. Navigate vault/root → UPLOAD HERE - RAW CONTENT → Tint Jobs
 * 3. Tint Jobs directly under configured root
 */
export async function resolveTintJobsFolderId(
  drive: DriveClient,
): Promise<{ folderId: string | null; warnings: ValidationWarning[] }> {
  const warnings: ValidationWarning[] = [];

  const direct = process.env.GOOGLE_DRIVE_TINT_JOBS_FOLDER_ID;
  if (direct) {
    return { folderId: direct, warnings };
  }

  const rootId =
    process.env.GOOGLE_DRIVE_CONTENT_VAULT_FOLDER_ID ||
    process.env.GOOGLE_DRIVE_UPLOADS_FOLDER_ID;

  if (!rootId) {
    return {
      folderId: null,
      warnings: [
        {
          code: "missing_root",
          message:
            "Set GOOGLE_DRIVE_TINT_JOBS_FOLDER_ID or GOOGLE_DRIVE_CONTENT_VAULT_FOLDER_ID / GOOGLE_DRIVE_UPLOADS_FOLDER_ID.",
        },
      ],
    };
  }

  const rootChildren = await listChildFolders(drive, rootId);

  const rawContent = rootChildren.find((folder) =>
    nameMatches(folder.name, RAW_CONTENT_FOLDER_NAMES),
  );

  const searchParentId = rawContent?.id || rootId;
  if (!rawContent) {
    warnings.push({
      code: "raw_content_not_found",
      message:
        "UPLOAD HERE - RAW CONTENT not found under root; searching root for Tint Jobs.",
    });
  }

  const searchChildren =
    searchParentId === rootId
      ? rootChildren
      : await listChildFolders(drive, searchParentId);

  const tintJobs = searchChildren.find((folder) =>
    nameMatches(folder.name, TINT_JOBS_FOLDER_NAMES),
  );

  if (!tintJobs?.id) {
    warnings.push({
      code: "tint_jobs_not_found",
      message:
        "Tint Jobs folder not found. Share Tint Jobs (or set GOOGLE_DRIVE_TINT_JOBS_FOLDER_ID).",
    });
    return { folderId: null, warnings };
  }

  return { folderId: tintJobs.id, warnings };
}

function buildStableSlug(driveFolderId: string, vehicle: string, workDate: string | null) {
  const base = [
    workDate?.slice(0, 7),
    vehicle || "vehicle",
    PORTFOLIO_SERVICE_TYPE,
    "altoona-pa",
    driveFolderId.slice(0, 8),
  ]
    .filter(Boolean)
    .map((part) => slugify(String(part)))
    .join("-")
    .replace(/-+/g, "-");
  return base || `tint-${driveFolderId}`;
}

function mergeWarnings(
  existing: unknown,
  next: ValidationWarning[],
): ValidationWarning[] {
  const prev = Array.isArray(existing)
    ? (existing as ValidationWarning[])
    : [];
  const map = new Map<string, ValidationWarning>();
  for (const item of [...prev, ...next]) {
    map.set(`${item.code}:${item.message}`, item);
  }
  return Array.from(map.values());
}

export async function syncDriveContentUploads(
  optionsInput?: Partial<PortfolioSyncOptions>,
): Promise<PortfolioSyncResult> {
  const options: PortfolioSyncOptions = {
    ...syncOptionsFromEnv(),
    ...optionsInput,
  };

  const empty: PortfolioSyncResult = {
    success: false,
    mode: options.mode,
    maxFolders: options.maxFolders,
    tintJobsFolderId: null,
    scannedMonthFolders: 0,
    importedFolders: 0,
    skippedFolders: 0,
    warnings: [],
    items: [],
  };

  if (!isGoogleDriveConfigured()) {
    return {
      ...empty,
      warnings: [
        {
          code: "drive_not_configured",
          message: "Google Drive is not configured.",
        },
      ],
    };
  }

  const auth = await getDriveAuthClient();
  const drive = google.drive({ version: "v3", auth });
  const supabase = getSupabaseAdmin();
  const aggregateWarnings: ValidationWarning[] = [];

  const resolved = await resolveTintJobsFolderId(drive);
  aggregateWarnings.push(...resolved.warnings);

  if (!resolved.folderId) {
    return {
      ...empty,
      warnings: aggregateWarnings,
    };
  }

  const monthFolders = await listChildFolders(drive, resolved.folderId);
  const parsedMonths = monthFolders
    .map((folder) => ({
      folder,
      parsed: parseMonthFolder(folder.name || ""),
    }))
    .sort((a, b) => compareMonthFoldersNewestFirst(a.parsed, b.parsed));

  const result: PortfolioSyncResult = {
    success: true,
    mode: options.mode,
    maxFolders: options.maxFolders,
    tintJobsFolderId: resolved.folderId,
    scannedMonthFolders: parsedMonths.length,
    importedFolders: 0,
    skippedFolders: 0,
    warnings: aggregateWarnings,
    items: [],
  };

  for (const { folder: monthFolder, parsed: monthParsed } of parsedMonths) {
    if (!isMonthFolderInSyncRange(monthParsed, options)) {
      continue;
    }

    const vehicleFolders = await listChildFolders(drive, monthFolder.id!);
    // Newest-first: Drive createdTime desc, then name
    vehicleFolders.sort((a, b) => {
      const aTime = a.createdTime ? Date.parse(a.createdTime) : 0;
      const bTime = b.createdTime ? Date.parse(b.createdTime) : 0;
      if (aTime !== bTime) return bTime - aTime;
      return (b.name || "").localeCompare(a.name || "");
    });

    for (const vehicleFolder of vehicleFolders) {
      if (result.importedFolders >= options.maxFolders) {
        result.skippedFolders += 1;
        continue;
      }

      const folderId = vehicleFolder.id;
      if (!folderId) {
        result.skippedFolders += 1;
        continue;
      }

      const vehicleParsed = parseVehicleFolder(
        vehicleFolder.name || "",
        monthParsed,
        {
          driveCreatedTime: vehicleFolder.createdTime,
          driveModifiedTime: vehicleFolder.modifiedTime,
        },
      );
      const vehicleLabel = normalizeProvisionalVehicleLabel(
        vehicleParsed.vehicle || vehicleParsed.rawName,
      );
      const importScope = determineImportScope(monthParsed, options);

      const driveFiles = await listChildFiles(drive, folderId);
      const inventory = inventoryDriveMedia(
        driveFiles.map(
          (file): DriveFileInventory => ({
            id: file.id || "",
            name: file.name || "",
            mimeType: file.mimeType || "",
            createdTime: file.createdTime,
            modifiedTime: file.modifiedTime,
            size: file.size,
          }),
        ).filter((file) => Boolean(file.id)),
      );

      const validationErrors = mergeWarnings(
        [],
        [...vehicleParsed.warnings, ...inventory.warnings],
      );

      if (!supabase) {
        result.items.push({
          driveFolderId: folderId,
          driveFolderName: vehicleParsed.rawName,
          vehicle: vehicleLabel || vehicleParsed.rawName,
          workDate: vehicleParsed.workDate,
          status: "pending_review",
          importScope,
          imageCount: inventory.imageCount,
          videoCount: inventory.videoCount,
          warningCount: validationErrors.length,
        });
        result.importedFolders += 1;
        continue;
      }

      // content_uploads mirror (no invented social captions)
      await supabase.from("content_uploads").upsert(
        {
          drive_folder_id: folderId,
          drive_folder_url:
            `https://drive.google.com/drive/folders/${folderId}`,
          vehicle_name: vehicleLabel || vehicleParsed.rawName,
          service_type: PORTFOLIO_SERVICE_TYPE,
          photos_count: inventory.imageCount,
          videos_count: inventory.videoCount,
          upload_date: vehicleParsed.workDate,
          caption_reel: null,
          caption_facebook: null,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "drive_folder_id" },
      );

      const { data: existing } = await supabase
        .from("gallery_items")
        .select("*")
        .eq("drive_folder_id", folderId)
        .maybeSingle();

      const lockedStatuses = new Set(["approved", "rejected", "archived"]);
      const isLocked = existing && lockedStatuses.has(existing.status);

      // Never invent SEO / marketing copy. Keep existing SEO if already set.
      const nextVehicle =
        isLocked || (existing && existing.provisional_vehicle === false)
          ? existing.vehicle
          : vehicleLabel || vehicleParsed.rawName || "Untitled vehicle";

      const nextWorkDate =
        isLocked || (existing && existing.provisional_vehicle === false)
          ? existing.work_date
          : vehicleParsed.workDate;

      const nextShade =
        existing?.shade_percentage != null
          ? existing.shade_percentage
          : null;

      const nextStatus = isLocked ? existing.status : "pending";
      const nextPublished = isLocked ? existing.published : false;

      const slug =
        existing?.slug ||
        buildStableSlug(folderId, nextVehicle, nextWorkDate);

      const upsertPayload: Record<string, unknown> = {
        slug,
        drive_folder_id: folderId,
        drive_parent_folder_id: monthFolder.id || null,
        drive_folder_name: vehicleParsed.rawName,
        source_month_folder_name: monthParsed.rawName,
        vehicle: nextVehicle,
        service_type: PORTFOLIO_SERVICE_TYPE,
        work_date: nextWorkDate,
        shade_percentage: nextShade,
        status: nextStatus,
        published: nextPublished,
        provisional_vehicle: isLocked
          ? false
          : existing?.provisional_vehicle === false
            ? false
            : true,
        validation_errors: isLocked
          ? mergeWarnings(existing.validation_errors, inventory.warnings)
          : validationErrors,
        import_scope: isLocked ? existing.import_scope || importScope : importScope,
        // Do not expose Drive URLs publicly via legacy JSONB on new syncs.
        // Preserve existing approved media URL arrays if locked.
        photos: isLocked ? existing.photos || [] : [],
        videos: isLocked ? existing.videos || [] : [],
      };

      // Never overwrite confirmed approval metadata
      if (isLocked) {
        upsertPayload.approved_at = existing.approved_at;
        upsertPayload.approved_by = existing.approved_by;
        upsertPayload.seo_title = existing.seo_title;
        upsertPayload.seo_description = existing.seo_description;
      } else {
        // Explicitly clear invented SEO on pending re-syncs
        upsertPayload.seo_title = existing?.seo_title ?? null;
        upsertPayload.seo_description = existing?.seo_description ?? null;
      }

      const { data: galleryItem, error: galleryError } = await supabase
        .from("gallery_items")
        .upsert(upsertPayload, { onConflict: "drive_folder_id" })
        .select("*")
        .single();

      if (galleryError || !galleryItem) {
        aggregateWarnings.push({
          code: "gallery_upsert_failed",
          message: galleryError?.message || `Failed to upsert folder ${folderId}`,
        });
        result.skippedFolders += 1;
        continue;
      }

      // Media inventory only — no binary download, no public Drive URLs
      for (const media of inventory.media) {
        if (!media.mediaType) {
          // Still record unsupported files as rejected inventory rows when possible
        }

        const mediaType = media.mediaType;
        if (!mediaType) continue;

        // Preserve admin featured choice on locked/approved items
        let isFeatured = media.isFeatured;
        if (isLocked) {
          const { data: existingMedia } = await supabase
            .from("gallery_media")
            .select("is_featured")
            .eq("gallery_item_id", galleryItem.id)
            .eq("drive_file_id", media.driveFileId)
            .maybeSingle();
          if (existingMedia) {
            isFeatured = existingMedia.is_featured;
          } else {
            isFeatured = false;
          }
        }

        await supabase.from("gallery_media").upsert(
          {
            gallery_item_id: galleryItem.id,
            drive_file_id: media.driveFileId,
            drive_file_name: media.driveFileName,
            drive_created_at: media.driveCreatedAt,
            drive_modified_at: media.driveModifiedAt,
            storage_url: null,
            mime_type: media.mimeType,
            media_type: mediaType,
            bytes: media.bytes,
            sort_order: media.sortOrder,
            is_featured: isFeatured,
            validation_status: media.validationStatus,
            rejected_reason: media.rejectedReason,
          },
          { onConflict: "gallery_item_id,drive_file_id" },
        );
      }

      result.items.push({
        driveFolderId: folderId,
        driveFolderName: vehicleParsed.rawName,
        vehicle: nextVehicle,
        workDate: nextWorkDate,
        status: nextStatus,
        importScope,
        imageCount: inventory.imageCount,
        videoCount: inventory.videoCount,
        warningCount: validationErrors.length,
      });
      result.importedFolders += 1;
    }
  }

  result.warnings = aggregateWarnings;
  return result;
}

export async function listContentUploadsFromDb() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data } = await supabase
    .from("content_uploads")
    .select("*")
    .order("upload_date", { ascending: false })
    .limit(100);

  return data || [];
}

export async function listPortfolioItemsFromDb() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("gallery_items")
    .select(
      "id, slug, vehicle, service_type, work_date, status, published, provisional_vehicle, validation_errors, drive_folder_id, drive_folder_name, source_month_folder_name, import_scope, shade_percentage, updated_at, created_at",
    )
    .eq("service_type", PORTFOLIO_SERVICE_TYPE)
    .order("work_date", { ascending: false, nullsFirst: false })
    .limit(150);

  if (error) {
    console.error("[portfolio] listPortfolioItemsFromDb:", error.message);
    return [];
  }

  const items = data || [];

  const withCounts = await Promise.all(
    items.map(async (item) => {
      const { data: media, error: mediaError } = await supabase
        .from("gallery_media")
        .select("media_type, validation_status")
        .eq("gallery_item_id", item.id);

      if (mediaError) {
        const warnings = Array.isArray(item.validation_errors)
          ? item.validation_errors
          : [];
        return {
          ...item,
          image_count: 0,
          video_count: 0,
          warning_count: warnings.length,
        };
      }

      const rows = media || [];
      const imageCount = rows.filter((row) => row.media_type === "image").length;
      const videoCount = rows.filter((row) => row.media_type === "video").length;
      const warnings = Array.isArray(item.validation_errors)
        ? item.validation_errors
        : [];

      return {
        ...item,
        image_count: imageCount,
        video_count: videoCount,
        warning_count: warnings.length,
      };
    }),
  );

  return withCounts;
}
