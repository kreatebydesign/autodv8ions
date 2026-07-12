import type { Readable } from "node:stream";
import { google } from "googleapis";
import { getDriveAuthClient } from "@/lib/google/drive";
import { sha256Readable } from "../checksum";
import { withTimeout } from "../retry";
import type { AssetObjectIdentity, DownloadedAssetBytes } from "../types";
import type { SourceConnector } from "./types";

/**
 * Google Drive source connector (KXD Asset Engine).
 * Read-only downloads. Never writes to Drive / never deletes originals.
 */
export class GoogleDriveSourceConnector implements SourceConnector {
  readonly id = "google_drive";

  async openDownloadStream(
    identity: AssetObjectIdentity,
    options?: { signal?: AbortSignal },
  ): Promise<{ stream: Readable; contentType: string | null }> {
    if (options?.signal?.aborted) {
      throw new Error("Download aborted.");
    }

    const auth = await getDriveAuthClient();
    const drive = google.drive({ version: "v3", auth });

    const response = await drive.files.get(
      {
        fileId: identity.sourceObjectId,
        alt: "media",
        supportsAllDrives: true,
      },
      { responseType: "stream" },
    );

    const stream = response.data as unknown as Readable;
    const contentType =
      (response.headers?.["content-type"] as string | undefined) ||
      identity.mimeType ||
      null;

    return { stream, contentType };
  }

  async downloadObject(
    identity: AssetObjectIdentity,
    options: { maxBytes: number; signal?: AbortSignal },
  ): Promise<DownloadedAssetBytes> {
    const { stream, contentType } = await this.openDownloadStream(identity, {
      signal: options.signal,
    });

    const result = await withTimeout(
      sha256Readable(stream, { maxBytes: options.maxBytes }),
      // Timeout is enforced by caller via withTimeout around this method usually;
      // keep a generous local ceiling when used standalone.
      120_000,
      "drive_download",
    );

    return {
      bytes: result.buffer,
      byteLength: result.byteLength,
      checksumSha256: result.checksumSha256,
      contentType,
    };
  }
}
