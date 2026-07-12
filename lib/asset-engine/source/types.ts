import type { Readable } from "node:stream";
import type { AssetObjectIdentity, DownloadedAssetBytes } from "../types";

/**
 * Source connector abstraction (Drive, Dropbox, OneDrive, S3, local, …).
 * Implementations must be product-agnostic.
 */
export interface SourceConnector {
  readonly id: string;

  downloadObject(
    identity: AssetObjectIdentity,
    options: { maxBytes: number; signal?: AbortSignal },
  ): Promise<DownloadedAssetBytes>;

  /**
   * Optional streaming download for large objects.
   * Callers may fall back to downloadObject when unsupported.
   */
  openDownloadStream?(
    identity: AssetObjectIdentity,
    options?: { signal?: AbortSignal },
  ): Promise<{ stream: Readable; contentType: string | null }>;
}
