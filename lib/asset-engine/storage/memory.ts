import type { StorageProvider, StorageHeadResult, StoragePutInput } from "./types";
import type { StoredAssetObject } from "../types";
import { toOwnedNodeBuffer, isBinaryLike } from "../bytes";

/** In-memory provider for unit tests. Never used in production. */
export class MemoryStorageProvider implements StorageProvider {
  readonly id = "memory" as const;
  private objects = new Map<
    string,
    { body: Buffer; contentType: string; checksumSha256: string; uploadedAt: string }
  >();

  async put(input: StoragePutInput): Promise<StoredAssetObject> {
    if (this.objects.has(input.pathname) && !input.allowOverwrite) {
      throw new Error(`Object already exists: ${input.pathname}`);
    }

    const body = isBinaryLike(input.body)
      ? toOwnedNodeBuffer(input.body)
      : Buffer.from(String(input.body));

    const uploadedAt = new Date().toISOString();
    this.objects.set(input.pathname, {
      body,
      contentType: input.contentType,
      checksumSha256: input.checksumSha256 || "",
      uploadedAt,
    });

    return {
      key: input.pathname,
      pathname: input.pathname,
      provider: this.id,
      byteLength: body.byteLength,
      contentType: input.contentType,
      checksumSha256: input.checksumSha256 || "",
      access: "private",
      privateUrl: null,
      uploadedAt,
    };
  }

  async head(pathname: string): Promise<StorageHeadResult> {
    const obj = this.objects.get(pathname);
    if (!obj) {
      return { pathname, byteLength: null, contentType: null, exists: false };
    }
    return {
      pathname,
      byteLength: obj.body.byteLength,
      contentType: obj.contentType,
      exists: true,
    };
  }

  async exists(pathname: string): Promise<boolean> {
    return this.objects.has(pathname);
  }

  async delete(pathname: string): Promise<void> {
    this.objects.delete(pathname);
  }

  getBuffer(pathname: string): Buffer | null {
    return this.objects.get(pathname)?.body ?? null;
  }

  clear(): void {
    this.objects.clear();
  }
}
