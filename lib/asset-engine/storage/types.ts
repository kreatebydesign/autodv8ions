import type {
  AssetStorageProviderId,
  StoredAssetObject,
} from "../types";

export type StoragePutInput = {
  /** Stable logical key / pathname within the store. */
  pathname: string;
  body: Buffer | ReadableStream | Blob | string;
  contentType: string;
  /** Always private in Phase 2A. */
  access: "private";
  multipart?: boolean;
  /** Prevent accidental overwrite of an existing object. */
  allowOverwrite?: boolean;
  /** Optional content hash for idempotent bookkeeping. */
  checksumSha256?: string;
};

export type StorageHeadResult = {
  pathname: string;
  byteLength: number | null;
  contentType: string | null;
  exists: boolean;
};

/**
 * Provider-agnostic object storage.
 * Future: S3, R2, GCS, local_dev — implement this interface only.
 */
export interface StorageProvider {
  readonly id: AssetStorageProviderId;

  put(input: StoragePutInput): Promise<StoredAssetObject>;

  head(pathname: string): Promise<StorageHeadResult>;

  /** Soft check used for duplicate prevention. */
  exists(pathname: string): Promise<boolean>;

  /**
   * Delete is available for compensating rollback only.
   * Never use to delete Drive / source originals.
   */
  delete(pathname: string): Promise<void>;
}
