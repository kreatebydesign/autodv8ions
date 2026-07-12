import type { SourceConnector } from "../source/types";
import type { StorageProvider } from "../storage/types";
import { sha256Buffer } from "../checksum";
import { withRetries, withTimeout } from "../retry";
import { resolveIngestLimits } from "../limits";
import {
  buildVariantRecord,
  processImageBuffer,
  variantPathname,
  webSafeMasterPathname,
} from "../processing/image";
import { assertNoVideoTranscode, collectVideoMetadata } from "../processing/video";
import { isImageMime, isVideoMime } from "../processing/variants";
import { isAlreadyProcessed } from "../state-machine";
import type {
  AssetIngestLimits,
  AssetObjectIdentity,
  AssetProcessingStatus,
  AssetVariantName,
  AssetVariantRecord,
  ProcessedAssetResult,
  StoredAssetObject,
} from "../types";

export type AssetIngestJobInput = {
  identity: AssetObjectIdentity;
  processingStatus: AssetProcessingStatus;
  existingBlobKey?: string | null;
  existingChecksum?: string | null;
  attempts?: number;
};

export type AssetIngestJobResult =
  | {
      ok: true;
      skipped: true;
      reason: "already_processed";
      recordId: string;
    }
  | {
      ok: true;
      skipped: false;
      recordId: string;
      result: ProcessedAssetResult;
    }
  | {
      ok: false;
      recordId: string;
      errorCode: string;
      message: string;
      attempts: number;
    };

function extensionFromFilename(filename: string, mimeType: string): string {
  const fromName = filename.includes(".")
    ? filename.split(".").pop()?.toLowerCase()
    : null;
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/heic") return "heic";
  if (mimeType === "image/heif") return "heif";
  if (mimeType === "video/mp4") return "mp4";
  if (mimeType === "video/quicktime") return "mov";
  return "bin";
}

export function buildAssetBasePath(identity: AssetObjectIdentity): string {
  const safeName = identity.filename.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
  return `assets/${identity.sourceConnector}/${identity.recordId}/${safeName || "file"}`;
}

export function buildOriginalPathname(identity: AssetObjectIdentity): string {
  const ext = extensionFromFilename(identity.filename, identity.mimeType);
  return `${buildAssetBasePath(identity)}/original.${ext}`;
}

/**
 * Core KXD Asset Engine ingestion for a single object.
 * Idempotent: skips when already processed / ready_for_review.
 * Never publishes. Never deletes source originals.
 */
export async function ingestAssetObject(input: {
  job: AssetIngestJobInput;
  source: SourceConnector;
  storage: StorageProvider;
  limits?: Partial<AssetIngestLimits>;
}): Promise<AssetIngestJobResult> {
  const limits = resolveIngestLimits(input.limits);
  const { job, source, storage } = input;
  const attempts = (job.attempts || 0) + 1;

  if (isAlreadyProcessed(job.processingStatus)) {
    return {
      ok: true,
      skipped: true,
      reason: "already_processed",
      recordId: job.identity.recordId,
    };
  }

  if (
    job.existingBlobKey &&
    job.processingStatus === "ready_for_review"
  ) {
    return {
      ok: true,
      skipped: true,
      reason: "already_processed",
      recordId: job.identity.recordId,
    };
  }

  try {
    const maxBytes = isVideoMime(job.identity.mimeType)
      ? limits.maxVideoBytes
      : limits.maxImageBytes;

    const downloaded = await withRetries(
      () =>
        withTimeout(
          source.downloadObject(job.identity, { maxBytes }),
          limits.downloadTimeoutMs,
          "asset_download",
        ),
      {
        maxAttempts: limits.maxAttempts,
        baseDelayMs: limits.retryBaseDelayMs,
      },
    );

    // Optional checksum validation when a prior hash exists
    if (
      job.existingChecksum &&
      job.existingChecksum.length === 64 &&
      job.existingChecksum !== downloaded.checksumSha256
    ) {
      throw new Error("Checksum mismatch versus existing content_hash.");
    }

    const originalPath = buildOriginalPathname(job.identity);

    // Duplicate Blob prevention: reuse existing pathname when present
    const alreadyStored = await storage.exists(originalPath);
    let original: StoredAssetObject;

    if (alreadyStored && job.existingBlobKey === originalPath) {
      original = {
        key: originalPath,
        pathname: originalPath,
        provider: storage.id,
        byteLength: downloaded.byteLength,
        contentType: downloaded.contentType || job.identity.mimeType,
        checksumSha256: downloaded.checksumSha256,
        access: "private",
        privateUrl: null,
        uploadedAt: new Date().toISOString(),
      };
    } else if (alreadyStored) {
      // Path taken — treat as idempotent hit; do not re-upload.
      original = {
        key: originalPath,
        pathname: originalPath,
        provider: storage.id,
        byteLength: downloaded.byteLength,
        contentType: downloaded.contentType || job.identity.mimeType,
        checksumSha256: downloaded.checksumSha256,
        access: "private",
        privateUrl: null,
        uploadedAt: new Date().toISOString(),
      };
    } else {
      original = await storage.put({
        pathname: originalPath,
        body: downloaded.bytes,
        contentType: downloaded.contentType || job.identity.mimeType,
        access: "private",
        multipart: downloaded.byteLength > 8 * 1024 * 1024,
        checksumSha256: downloaded.checksumSha256,
        allowOverwrite: false,
      });
    }

    const mime = downloaded.contentType || job.identity.mimeType;
    const variants: Partial<Record<AssetVariantName, AssetVariantRecord>> = {};
    let width: number | null = null;
    let height: number | null = null;
    let durationSeconds: number | null = null;
    let derivedMimeType: string | null = null;
    const basePath = buildAssetBasePath(job.identity);

    if (isImageMime(mime) || job.identity.mediaKind === "image") {
      const processed = await processImageBuffer(downloaded.bytes, {
        mimeType: mime,
      });
      width = processed.width;
      height = processed.height;
      derivedMimeType = processed.derivedMimeType;

      if (processed.webSafeOriginal) {
        const masterPath = webSafeMasterPathname(basePath);
        if (!(await storage.exists(masterPath))) {
          await storage.put({
            pathname: masterPath,
            body: processed.webSafeOriginal,
            contentType: processed.derivedMimeType,
            access: "private",
            checksumSha256: sha256Buffer(processed.webSafeOriginal),
            allowOverwrite: false,
          });
        }
      }

      for (const variant of processed.variants) {
        const path = variantPathname(basePath, variant.name);
        if (!(await storage.exists(path))) {
          await storage.put({
            pathname: path,
            body: variant.buffer,
            contentType: variant.mimeType,
            access: "private",
            checksumSha256: variant.checksumSha256,
            allowOverwrite: false,
          });
        }
        variants[variant.name] = buildVariantRecord(variant.name, path, variant);
      }
    } else if (isVideoMime(mime) || job.identity.mediaKind === "video") {
      assertNoVideoTranscode();
      const meta = collectVideoMetadata({
        mimeType: mime,
        byteLength: downloaded.byteLength,
      });
      width = meta.width;
      height = meta.height;
      durationSeconds = meta.durationSeconds;
    } else {
      throw new Error(`Unsupported media kind/mime: ${mime}`);
    }

    const result: ProcessedAssetResult = {
      status: "ready_for_review",
      original,
      variants,
      width,
      height,
      durationSeconds,
      originalMimeType: mime,
      derivedMimeType,
      checksumSha256: downloaded.checksumSha256,
      byteLength: downloaded.byteLength,
    };

    return {
      ok: true,
      skipped: false,
      recordId: job.identity.recordId,
      result,
    };
  } catch (error) {
    return {
      ok: false,
      recordId: job.identity.recordId,
      errorCode: "ingest_failed",
      message:
        error instanceof Error ? error.message : "Asset ingestion failed.",
      attempts,
    };
  }
}
