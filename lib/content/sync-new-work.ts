import { previewDriveDiscovery } from "@/lib/google/drive-discovery";
import { runPendingDriveImport } from "@/lib/google/drive-import-pending";
import { isGoogleDriveConfigured } from "@/lib/google/drive";
import { listMediaProcessingQueue } from "@/lib/live-portfolio/media-queue";
import { runGalleryMediaProcessing } from "@/lib/live-portfolio/media-process";
import { listPortfolioItemsFromDb } from "@/lib/google/drive";

export type SyncNewWorkResult = {
  ok: boolean;
  driveConnected: boolean;
  discovery: {
    octoberJobFolders: number | null;
    octoberMediaFiles: number | null;
  };
  import: Awaited<ReturnType<typeof runPendingDriveImport>> | null;
  mediaProcess: Awaited<ReturnType<typeof runGalleryMediaProcessing>> | null;
  mediaProcessPasses: number;
  queueAfter: Awaited<ReturnType<typeof listMediaProcessingQueue>> | null;
  pendingReviewCount: number;
  readyForReviewCount: number;
  message: string;
  error?: { code: string; message: string };
};

const MEDIA_PROCESS_MAX_PASSES = 8;
const ITEMS_PER_PASS = 25;

/**
 * One-shot admin workflow: import current-month pending jobs, then process Blob queue.
 * Does not publish. Reuses existing import and media pipelines.
 */
export async function runSyncNewWork(): Promise<SyncNewWorkResult> {
  if (!isGoogleDriveConfigured()) {
    return {
      ok: false,
      driveConnected: false,
      discovery: { octoberJobFolders: null, octoberMediaFiles: null },
      import: null,
      mediaProcess: null,
      mediaProcessPasses: 0,
      queueAfter: null,
      pendingReviewCount: 0,
      readyForReviewCount: 0,
      message: "Google Drive is not connected yet.",
      error: {
        code: "drive_not_configured",
        message: "Google Drive is not connected yet.",
      },
    };
  }

  let octoberJobFolders: number | null = null;
  let octoberMediaFiles: number | null = null;
  try {
    const preview = await previewDriveDiscovery();
    if (preview.ok && Array.isArray(preview.months)) {
      const oct = preview.months.find((m) =>
        /2026-10|october/i.test(m.folderName || ""),
      );
      octoberJobFolders = oct?.jobCount ?? null;
      octoberMediaFiles = oct?.mediaCount ?? null;
    }
  } catch {
    // Discovery is informational; import still proceeds.
  }

  let importResult: Awaited<ReturnType<typeof runPendingDriveImport>>;
  try {
    importResult = await runPendingDriveImport({
      confirmPendingImport: true,
      maxMonths: 1,
      maxItems: 60,
      maxMedia: 150,
      skipReviewQueueTrim: true,
    });
  } catch (err) {
    return {
      ok: false,
      driveConnected: true,
      discovery: { octoberJobFolders, octoberMediaFiles },
      import: null,
      mediaProcess: null,
      mediaProcessPasses: 0,
      queueAfter: null,
      pendingReviewCount: 0,
      readyForReviewCount: 0,
      message: err instanceof Error ? err.message : "Drive import failed.",
      error: {
        code: "import_failed",
        message: err instanceof Error ? err.message : "Drive import failed.",
      },
    };
  }

  if (!importResult.ok) {
    return {
      ok: false,
      driveConnected: true,
      discovery: { octoberJobFolders, octoberMediaFiles },
      import: importResult,
      mediaProcess: null,
      mediaProcessPasses: 0,
      queueAfter: null,
      pendingReviewCount: 0,
      readyForReviewCount: 0,
      message: importResult.error?.message || "Pending import failed.",
      error: importResult.error,
    };
  }

  let lastProcess: Awaited<ReturnType<typeof runGalleryMediaProcessing>> | null =
    null;
  let passes = 0;

  for (let pass = 0; pass < MEDIA_PROCESS_MAX_PASSES; pass += 1) {
    const queue = await listMediaProcessingQueue({ limit: 100 });
    const pendingCount = queue.items.filter(
      (item) =>
        item.processingStatus === "pending_download" ||
        item.processingStatus === "downloaded" ||
        item.processingStatus === "processed",
    ).length;

    if (pendingCount === 0) break;

    lastProcess = await runGalleryMediaProcessing({
      confirmMediaProcess: true,
      maxItems: ITEMS_PER_PASS,
    });
    passes += 1;

    if (!lastProcess.ok) break;
    const passProcessed = lastProcess.summary?.processed ?? 0;
    const passFailed = lastProcess.summary?.failed ?? 0;
    if (passProcessed === 0 && passFailed === 0) {
      break;
    }
  }

  const queueAfter = await listMediaProcessingQueue({ limit: 100 });
  const items = await listPortfolioItemsFromDb();
  const pendingReviewCount = items.filter(
    (item) =>
      item.status === "pending" ||
      item.status === "pending_review" ||
      item.status === "draft",
  ).length;

  const readyForReviewCount = queueAfter.items.filter(
    (item) => item.processingStatus === "ready_for_review",
  ).length;

  const importCreated = importResult.counts?.createdGalleryItems ?? 0;
  const importMatched = importResult.counts?.matchedGalleryItems ?? 0;
  const processedTotal = lastProcess?.summary?.processed ?? 0;

  const message = [
    octoberJobFolders != null
      ? `Drive (Oct): ${octoberJobFolders} job folder(s), ${octoberMediaFiles ?? 0} media file(s) in discovery preview.`
      : "Drive discovery preview unavailable (import still ran).",
    `Import: ${importCreated} new job(s), ${importMatched} matched existing.`,
    `Media: ${passes} processing pass(es), ${processedTotal} file(s) processed this run.`,
    `${pendingReviewCount} job(s) awaiting review.`,
    readyForReviewCount > 0
      ? `${readyForReviewCount} file(s) ready in Review.`
      : "Process any remaining files in Processing if the queue still shows pending downloads.",
    "Nothing was published to the website.",
  ].join(" ");

  return {
    ok: importResult.ok && (lastProcess?.ok !== false),
    driveConnected: true,
    discovery: { octoberJobFolders, octoberMediaFiles },
    import: importResult,
    mediaProcess: lastProcess,
    mediaProcessPasses: passes,
    queueAfter,
    pendingReviewCount,
    readyForReviewCount,
    message,
    error: lastProcess?.ok === false ? lastProcess.error : undefined,
  };
}
