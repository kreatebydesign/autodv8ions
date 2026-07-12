import { google, type drive_v3 } from "googleapis";
import {
  DriveAuthError,
  getDriveAuthMode,
  sanitizeErrorMessage,
} from "@/lib/google/auth-drive";
import {
  getDriveAuthClient,
  resolveTintJobsFolderId,
} from "@/lib/google/drive";
import {
  classifyDiscoveryMedia,
  compareDiscoveryFilesNewestFirst,
  toIgnoredItem,
} from "@/lib/live-portfolio/discovery-classify";
import {
  DISCOVERY_LIMITS,
  type DiscoveredJobFolder,
  type DiscoveredMediaFile,
  type DiscoveredMonthFolder,
  type DriveDiscoveryPreviewResponse,
  type DriveDiscoveryResult,
  type IgnoredDiscoveryItem,
} from "@/lib/live-portfolio/discovery-types";
import { parseMonthFolder } from "@/lib/live-portfolio/parse-drive-folder";
import type { ValidationWarning } from "@/lib/live-portfolio/types";
import { compareMonthFoldersNewestFirst } from "@/lib/live-portfolio/validation";

type DriveClient = drive_v3.Drive;
type DriveFile = drive_v3.Schema$File;

const FOLDER_MIME = "application/vnd.google-apps.folder";

async function listChildrenPage(
  drive: DriveClient,
  parentId: string,
  options: {
    foldersOnly?: boolean;
    filesOnly?: boolean;
    pageToken?: string | null;
    pageSize: number;
  },
) {
  let q = `'${parentId}' in parents and trashed=false`;
  if (options.foldersOnly) q += ` and mimeType='${FOLDER_MIME}'`;
  if (options.filesOnly) q += ` and mimeType!='${FOLDER_MIME}'`;

  const { data } = await drive.files.list({
    q,
    fields:
      "nextPageToken, files(id,name,mimeType,createdTime,modifiedTime,webViewLink,size)",
    pageSize: options.pageSize,
    pageToken: options.pageToken || undefined,
    orderBy: options.foldersOnly ? "name desc" : undefined,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return {
    files: data.files || [],
    nextPageToken: data.nextPageToken || null,
  };
}

/**
 * Paginated list with hard caps. Stops when cap reached or pages exhausted.
 */
async function listChildrenCapped(
  drive: DriveClient,
  parentId: string,
  options: {
    foldersOnly?: boolean;
    filesOnly?: boolean;
    maxItems: number;
    pageSize: number;
  },
): Promise<{ files: DriveFile[]; truncated: boolean }> {
  const files: DriveFile[] = [];
  let pageToken: string | null = null;
  let truncated = false;

  do {
    const page = await listChildrenPage(drive, parentId, {
      foldersOnly: options.foldersOnly,
      filesOnly: options.filesOnly,
      pageToken,
      pageSize: options.pageSize,
    });

    for (const file of page.files) {
      if (files.length >= options.maxItems) {
        truncated = true;
        break;
      }
      files.push(file);
    }

    if (truncated) break;
    pageToken = page.nextPageToken;
    if (page.files.length === 0) break;
  } while (pageToken);

  // If we hit the cap and there was another page or leftover, mark truncated.
  if (!truncated && pageToken) truncated = true;

  return { files, truncated };
}

function warn(code: string, message: string): ValidationWarning {
  return { code, message };
}

function countWarnings(months: DiscoveredMonthFolder[], top: ValidationWarning[]) {
  let count = top.length;
  for (const month of months) {
    count += month.warnings.length;
    for (const job of month.jobs) count += job.warnings.length;
  }
  return count;
}

function countIgnored(
  months: DiscoveredMonthFolder[],
  top: IgnoredDiscoveryItem[],
) {
  let count = top.length;
  for (const month of months) {
    count += month.ignored.length;
    for (const job of month.jobs) count += job.ignored.length;
  }
  return count;
}

function discoverMediaInJob(
  files: DriveFile[],
  maxMedia: number,
): {
  media: DiscoveredMediaFile[];
  ignored: IgnoredDiscoveryItem[];
  truncated: boolean;
} {
  const sorted = [...files].sort(compareDiscoveryFilesNewestFirst);
  const media: DiscoveredMediaFile[] = [];
  const ignored: IgnoredDiscoveryItem[] = [];
  let truncated = false;

  for (const file of sorted) {
    const classified = classifyDiscoveryMedia({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
    });

    if (!classified.accepted) {
      ignored.push(
        toIgnoredItem({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          reason: classified.reason,
          detail: classified.detail,
        }),
      );
      continue;
    }

    if (media.length >= maxMedia) {
      truncated = true;
      ignored.push(
        toIgnoredItem({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          reason: "media_cap_reached",
          detail: `Media cap of ${maxMedia} reached for this job folder.`,
        }),
      );
      continue;
    }

    media.push({
      fileId: file.id!,
      fileName: file.name || "",
      mimeType: file.mimeType || "",
      extension: classified.extension,
      mediaKind: classified.mediaKind,
      createdTime: file.createdTime || null,
      modifiedTime: file.modifiedTime || null,
      webViewLink: file.webViewLink || null,
    });
  }

  return { media, ignored, truncated };
}

/**
 * Read-only Tint Jobs hierarchy discovery.
 * No DB writes, no downloads, no Blob, no sync.
 */
export async function discoverTintJobsDriveInventory(): Promise<DriveDiscoveryResult> {
  const authMode = getDriveAuthMode();
  if (authMode === "none") {
    throw new DriveAuthError(
      "drive_not_configured",
      "Google Drive is not configured for discovery.",
    );
  }

  const auth = await getDriveAuthClient();
  const drive = google.drive({ version: "v3", auth });
  const topWarnings: ValidationWarning[] = [];
  const topIgnored: IgnoredDiscoveryItem[] = [];

  const resolved = await resolveTintJobsFolderId(drive);
  topWarnings.push(...resolved.warnings);

  if (!resolved.folderId) {
    throw new DriveAuthError(
      "tint_jobs_not_found",
      "Tint Jobs folder could not be resolved for discovery.",
    );
  }

  const { data: root } = await drive.files.get({
    fileId: resolved.folderId,
    fields: "id,name,mimeType",
    supportsAllDrives: true,
  });

  const monthListing = await listChildrenCapped(drive, resolved.folderId, {
    foldersOnly: true,
    maxItems: DISCOVERY_LIMITS.maxMonthFolders,
    pageSize: DISCOVERY_LIMITS.pageSize,
  });

  const parsedMonths = monthListing.files
    .map((folder) => ({
      folder,
      parsed: parseMonthFolder(folder.name || ""),
    }))
    .sort((a, b) => compareMonthFoldersNewestFirst(a.parsed, b.parsed));

  const months: DiscoveredMonthFolder[] = [];
  let totalJobs = 0;
  let jobsTruncatedGlobal = false;
  let mediaTruncatedGlobal = false;

  for (const { folder, parsed } of parsedMonths) {
    if (!folder.id) {
      topIgnored.push(
        toIgnoredItem({
          id: null,
          name: folder.name,
          mimeType: folder.mimeType,
          reason: "missing_id",
          detail: "Month folder missing id.",
        }),
      );
      continue;
    }

    const monthWarnings = [...parsed.warnings];
    const monthIgnored: IgnoredDiscoveryItem[] = [];

    if (!parsed.ok) {
      monthWarnings.push(
        warn(
          "unparsed_month_folder",
          `Folder "${parsed.rawName}" was inventoried but month/year could not be parsed confidently.`,
        ),
      );
    }

    const remainingJobBudget = Math.max(
      0,
      DISCOVERY_LIMITS.maxJobFoldersTotal - totalJobs,
    );
    const jobCap = Math.min(
      DISCOVERY_LIMITS.maxJobFoldersPerMonth,
      remainingJobBudget,
    );

    const jobs: DiscoveredJobFolder[] = [];
    let jobsTruncated = false;

    if (jobCap === 0) {
      jobsTruncated = true;
      jobsTruncatedGlobal = true;
    } else {
      const jobListing = await listChildrenCapped(drive, folder.id, {
        foldersOnly: true,
        maxItems: jobCap,
        pageSize: DISCOVERY_LIMITS.pageSize,
      });
      jobsTruncated = jobListing.truncated;
      if (jobsTruncated) jobsTruncatedGlobal = true;

      // Non-folder children under a month folder are ignored (not job folders)
      const looseFiles = await listChildrenCapped(drive, folder.id, {
        filesOnly: true,
        maxItems: 25,
        pageSize: 25,
      });
      for (const file of looseFiles.files) {
        monthIgnored.push(
          toIgnoredItem({
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            reason: "not_a_folder",
            detail: "Loose file under month folder is not treated as a job folder.",
          }),
        );
      }

      const jobFoldersSorted = [...jobListing.files].sort((a, b) => {
        const aTime = a.createdTime ? Date.parse(a.createdTime) : 0;
        const bTime = b.createdTime ? Date.parse(b.createdTime) : 0;
        if (aTime !== bTime) return bTime - aTime;
        return (b.name || "").localeCompare(a.name || "");
      });

      for (const jobFolder of jobFoldersSorted) {
        if (!jobFolder.id) {
          monthIgnored.push(
            toIgnoredItem({
              id: null,
              name: jobFolder.name,
              mimeType: jobFolder.mimeType,
              reason: "missing_id",
              detail: "Job folder missing id.",
            }),
          );
          continue;
        }

        const mediaListing = await listChildrenCapped(drive, jobFolder.id, {
          filesOnly: true,
          maxItems: DISCOVERY_LIMITS.maxMediaFilesPerJob * 2,
          pageSize: DISCOVERY_LIMITS.pageSize,
        });

        // Nested folders inside a job folder are ignored in Phase 1B (no deep recursion)
        const nestedFolders = await listChildrenCapped(drive, jobFolder.id, {
          foldersOnly: true,
          maxItems: 10,
          pageSize: 10,
        });
        const jobIgnoredNested: IgnoredDiscoveryItem[] = nestedFolders.files.map(
          (nested) =>
            toIgnoredItem({
              id: nested.id,
              name: nested.name,
              mimeType: nested.mimeType,
              reason: "not_a_folder",
              detail:
                "Nested folders inside job folders are not traversed in Phase 1B.",
            }),
        );

        const discovered = discoverMediaInJob(
          mediaListing.files,
          DISCOVERY_LIMITS.maxMediaFilesPerJob,
        );
        if (discovered.truncated || mediaListing.truncated) {
          mediaTruncatedGlobal = true;
        }

        jobs.push({
          folderId: jobFolder.id,
          folderName: jobFolder.name || "",
          createdTime: jobFolder.createdTime || null,
          media: discovered.media,
          ignored: [...discovered.ignored, ...jobIgnoredNested],
          warnings: [],
          mediaTruncated: discovered.truncated || mediaListing.truncated,
        });
        totalJobs += 1;
      }
    }

    months.push({
      folderId: folder.id,
      folderName: folder.name || parsed.rawName,
      year: parsed.year,
      month: parsed.month,
      sortKey: parsed.sortKey,
      parseOk: parsed.ok,
      createdTime: folder.createdTime || null,
      jobs,
      ignored: monthIgnored,
      warnings: monthWarnings,
      jobsTruncated,
    });
  }

  return {
    authMode,
    sourceFolderId: resolved.folderId,
    sourceFolderName: root.name || "Tint Jobs",
    months,
    totals: {
      monthFolderCount: months.length,
      jobFolderCount: totalJobs,
      mediaFileCount: months.reduce(
        (sum, month) =>
          sum + month.jobs.reduce((jobSum, job) => jobSum + job.media.length, 0),
        0,
      ),
      ignoredCount: countIgnored(months, topIgnored),
      warningCount: countWarnings(months, topWarnings),
    },
    truncated: {
      months: monthListing.truncated,
      jobs: jobsTruncatedGlobal,
      media: mediaTruncatedGlobal,
    },
    warnings: topWarnings,
    ignored: topIgnored,
  };
}

export function buildDriveDiscoveryPreview(
  result: DriveDiscoveryResult,
): DriveDiscoveryPreviewResponse {
  const months = result.months.slice(0, DISCOVERY_LIMITS.sampleMonths).map((month) => {
    const mediaCount = month.jobs.reduce((sum, job) => sum + job.media.length, 0);
    const ignoredCount =
      month.ignored.length +
      month.jobs.reduce((sum, job) => sum + job.ignored.length, 0);

    return {
      folderId: month.folderId,
      folderName: month.folderName,
      year: month.year,
      month: month.month,
      sortKey: month.sortKey,
      parseOk: month.parseOk,
      jobCount: month.jobs.length,
      mediaCount,
      ignoredCount,
      warningCount: month.warnings.length,
      jobsTruncated: month.jobsTruncated,
      sampleJobs: month.jobs
        .slice(0, DISCOVERY_LIMITS.sampleJobsPerMonth)
        .map((job) => ({
          folderId: job.folderId,
          folderName: job.folderName,
          mediaCount: job.media.length,
          sampleMedia: job.media
            .slice(0, DISCOVERY_LIMITS.sampleMediaPerJob)
            .map((media) => ({
              fileName: media.fileName,
              mimeType: media.mimeType,
              mediaKind: media.mediaKind,
              extension: media.extension,
            })),
        })),
    };
  });

  const ignoredSample = [
    ...result.ignored,
    ...result.months.flatMap((month) => [
      ...month.ignored,
      ...month.jobs.flatMap((job) => job.ignored),
    ]),
  ].slice(0, DISCOVERY_LIMITS.ignoredSampleLimit);

  return {
    ok: true,
    authMode: result.authMode,
    rootFolder: {
      id: result.sourceFolderId,
      name: result.sourceFolderName,
    },
    monthFolderCount: result.totals.monthFolderCount,
    jobFolderCount: result.totals.jobFolderCount,
    mediaFileCount: result.totals.mediaFileCount,
    ignoredCount: result.totals.ignoredCount,
    warningCount: result.totals.warningCount,
    truncated: result.truncated,
    months,
    warnings: result.warnings,
    ignoredSample,
  };
}

export async function previewDriveDiscovery(): Promise<DriveDiscoveryPreviewResponse> {
  try {
    const result = await discoverTintJobsDriveInventory();
    return buildDriveDiscoveryPreview(result);
  } catch (error) {
    if (error instanceof DriveAuthError) {
      return {
        ok: false,
        authMode: getDriveAuthMode(),
        rootFolder: null,
        monthFolderCount: 0,
        jobFolderCount: 0,
        mediaFileCount: 0,
        ignoredCount: 0,
        warningCount: 0,
        truncated: { months: false, jobs: false, media: false },
        months: [],
        warnings: [],
        ignoredSample: [],
        error: { code: error.code, message: error.message },
      };
    }

    return {
      ok: false,
      authMode: getDriveAuthMode(),
      rootFolder: null,
      monthFolderCount: 0,
      jobFolderCount: 0,
      mediaFileCount: 0,
      ignoredCount: 0,
      warningCount: 0,
      truncated: { months: false, jobs: false, media: false },
      months: [],
      warnings: [],
      ignoredSample: [],
      error: {
        code: "discovery_failed",
        message: sanitizeErrorMessage(
          error instanceof Error ? error.message : "Drive discovery failed.",
        ),
      },
    };
  }
}
