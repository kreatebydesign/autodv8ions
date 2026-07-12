import type { StorageProvider } from "./types";
import { VercelBlobStorageProvider } from "./vercel-blob";
import { MemoryStorageProvider } from "./memory";
import type { AssetStorageProviderId } from "../types";

export type { StorageProvider, StoragePutInput, StorageHeadResult } from "./types";
export { VercelBlobStorageProvider } from "./vercel-blob";
export { MemoryStorageProvider } from "./memory";
export {
  resolveVercelBlobAuthOptions,
  toBlobSdkAuthFields,
  isVercelBlobOidcConfigured,
} from "./vercel-blob-auth";
export type { VercelBlobAuthOptions } from "./vercel-blob-auth";

export function createStorageProvider(
  id: AssetStorageProviderId = "vercel_blob",
): StorageProvider {
  switch (id) {
    case "vercel_blob":
      return new VercelBlobStorageProvider();
    case "memory":
      return new MemoryStorageProvider();
    case "s3":
    case "cloudflare_r2":
    case "gcs":
    case "local_dev":
      throw new Error(
        `Storage provider "${id}" is reserved for a later Asset Engine phase.`,
      );
    default:
      throw new Error(`Unknown storage provider: ${id}`);
  }
}

export function getDefaultStorageProvider(): StorageProvider {
  if (process.env.ASSET_STORAGE_PROVIDER === "memory") {
    return createStorageProvider("memory");
  }
  return createStorageProvider("vercel_blob");
}
