import { put, head, del } from "@vercel/blob";
import type { StorageProvider, StorageHeadResult, StoragePutInput } from "./types";
import type { StoredAssetObject } from "../types";
import { toOwnedNodeBuffer, isBinaryLike } from "../bytes";
import {
  resolveVercelBlobAuthOptions,
  toBlobSdkAuthFields,
} from "./vercel-blob-auth";

/**
 * Vercel Blob private store adapter.
 *
 * Production (connected store): authenticates via Vercel OIDC + BLOB_STORE_ID.
 * Local/off-Vercel optional fallback: BLOB_READ_WRITE_TOKEN.
 * Never requires a long-lived RW token when OIDC + store id are available.
 */
export class VercelBlobStorageProvider implements StorageProvider {
  readonly id = "vercel_blob" as const;

  private async authFields() {
    const auth = await resolveVercelBlobAuthOptions();
    return toBlobSdkAuthFields(auth);
  }

  async put(input: StoragePutInput): Promise<StoredAssetObject> {
    if (input.access !== "private") {
      throw new Error("VercelBlobStorageProvider only allows private access.");
    }

    const authFields = await this.authFields();

    // Always upload an owned Node Buffer — never SAB-backed views.
    const body = isBinaryLike(input.body)
      ? toOwnedNodeBuffer(input.body)
      : input.body;

    const result = await put(input.pathname, body, {
      access: "private",
      contentType: input.contentType,
      multipart: input.multipart === true,
      allowOverwrite: input.allowOverwrite === true,
      addRandomSuffix: false,
      ...authFields,
    });

    const sizeFromResult =
      typeof (result as unknown as { size?: number }).size === "number"
        ? (result as unknown as { size: number }).size
        : Buffer.isBuffer(body)
          ? body.byteLength
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
    const authFields = await this.authFields();

    try {
      const meta = await head(pathname, { ...authFields });
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
    const authFields = await this.authFields();
    await del(pathname, { ...authFields });
  }
}
