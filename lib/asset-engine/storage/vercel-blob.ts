import { put, head, del } from "@vercel/blob";
import type { StorageProvider, StorageHeadResult, StoragePutInput } from "./types";
import type { StoredAssetObject } from "../types";

/**
 * Vercel Blob private store adapter.
 * Requires BLOB_READ_WRITE_TOKEN and a private Blob store.
 */
export class VercelBlobStorageProvider implements StorageProvider {
  readonly id = "vercel_blob" as const;

  async put(input: StoragePutInput): Promise<StoredAssetObject> {
    if (input.access !== "private") {
      throw new Error("VercelBlobStorageProvider only allows private access.");
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      throw new Error("BLOB_READ_WRITE_TOKEN is not configured.");
    }

    const result = await put(input.pathname, input.body, {
      access: "private",
      contentType: input.contentType,
      token,
      multipart: input.multipart === true,
      allowOverwrite: input.allowOverwrite === true,
      addRandomSuffix: false,
    });

    const sizeFromResult =
      typeof (result as unknown as { size?: number }).size === "number"
        ? (result as unknown as { size: number }).size
        : Buffer.isBuffer(input.body)
          ? input.body.byteLength
          : 0;

    return {
      key: result.pathname,
      pathname: result.pathname,
      provider: this.id,
      byteLength: sizeFromResult,
      contentType: input.contentType,
      checksumSha256: input.checksumSha256 || "",
      access: "private",
      privateUrl: result.url,
      uploadedAt: new Date().toISOString(),
    };
  }

  async head(pathname: string): Promise<StorageHeadResult> {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      throw new Error("BLOB_READ_WRITE_TOKEN is not configured.");
    }

    try {
      const meta = await head(pathname, { token });
      return {
        pathname: meta.pathname,
        byteLength: meta.size,
        contentType: meta.contentType,
        exists: true,
      };
    } catch {
      return {
        pathname,
        byteLength: null,
        contentType: null,
        exists: false,
      };
    }
  }

  async exists(pathname: string): Promise<boolean> {
    const meta = await this.head(pathname);
    return meta.exists;
  }

  async delete(pathname: string): Promise<void> {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      throw new Error("BLOB_READ_WRITE_TOKEN is not configured.");
    }
    await del(pathname, { token });
  }
}
