import type { AssetObjectIdentity, DownloadedAssetBytes } from "../types";
import type { SourceConnector } from "./types";
import { sha256Buffer } from "../checksum";

/** Test double source connector. */
export class MemorySourceConnector implements SourceConnector {
  readonly id = "memory";
  private objects = new Map<string, { buffer: Buffer; contentType: string }>();

  seed(sourceObjectId: string, buffer: Buffer, contentType: string) {
    this.objects.set(sourceObjectId, { buffer, contentType });
  }

  async downloadObject(
    identity: AssetObjectIdentity,
    options: { maxBytes: number },
  ): Promise<DownloadedAssetBytes> {
    const obj = this.objects.get(identity.sourceObjectId);
    if (!obj) {
      throw new Error(`Source object not found: ${identity.sourceObjectId}`);
    }
    if (obj.buffer.byteLength > options.maxBytes) {
      throw new Error("Asset exceeds maxBytes limit.");
    }
    return {
      bytes: obj.buffer,
      byteLength: obj.buffer.byteLength,
      checksumSha256: sha256Buffer(obj.buffer),
      contentType: obj.contentType,
    };
  }
}

export type { SourceConnector } from "./types";
export { GoogleDriveSourceConnector } from "./google-drive";
