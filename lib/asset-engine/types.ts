/**
 * KXD Asset Engine — core types
 *
 * Reusable media ingestion abstractions. AutoDV8ions is the first consumer;
 * connectors and storage providers must stay product-agnostic.
 */

export type AssetSourceConnector =
  | "google_drive"
  | "dropbox"
  | "onedrive"
  | "local_upload"
  | "s3"
  | "unknown";

export type AssetStorageProviderId =
  | "vercel_blob"
  | "s3"
  | "cloudflare_r2"
  | "gcs"
  | "local_dev"
  | "memory";

/** Canonical processing states (Phase 2A). Never includes "published". */
export type AssetProcessingStatus =
  | "pending_download"
  | "downloaded"
  | "processed"
  | "ready_for_review"
  | "failed";

export type AssetMediaKind = "image" | "video" | "other";

export type AssetVariantName = "thumbnail" | "small" | "medium" | "large";

export type AssetVariantRecord = {
  key: string;
  pathname: string;
  bytes: number;
  width: number;
  height: number;
  mimeType: string;
  checksum: string;
};

export type AssetObjectIdentity = {
  /** Consumer-side record id (e.g. gallery_media.id). */
  recordId: string;
  sourceConnector: AssetSourceConnector;
  sourceObjectId: string;
  filename: string;
  mimeType: string;
  mediaKind: AssetMediaKind;
};

export type DownloadedAssetBytes = {
  bytes: Buffer;
  byteLength: number;
  checksumSha256: string;
  contentType: string | null;
};

export type StoredAssetObject = {
  key: string;
  pathname: string;
  provider: AssetStorageProviderId;
  byteLength: number;
  contentType: string;
  checksumSha256: string;
  /** Private stores must not expose a public URL. */
  access: "private";
  /** Opaque provider URL for authenticated retrieval only — never treat as public. */
  privateUrl: string | null;
  uploadedAt: string;
};

export type ProcessedAssetResult = {
  status: Exclude<AssetProcessingStatus, "pending_download" | "failed">;
  original: StoredAssetObject;
  variants: Partial<Record<AssetVariantName, AssetVariantRecord>>;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  originalMimeType: string;
  derivedMimeType: string | null;
  checksumSha256: string;
  byteLength: number;
};

export type AssetProcessingFailure = {
  status: "failed";
  errorCode: string;
  message: string;
  attempts: number;
};

export type AssetIngestLimits = {
  maxItemsPerRun: number;
  maxImageBytes: number;
  maxVideoBytes: number;
  downloadTimeoutMs: number;
  maxAttempts: number;
  retryBaseDelayMs: number;
};
