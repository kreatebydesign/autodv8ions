import type { AssetIngestLimits } from "./types";

export const DEFAULT_ASSET_INGEST_LIMITS: AssetIngestLimits = {
  maxItemsPerRun: 5,
  maxImageBytes: 40 * 1024 * 1024,
  maxVideoBytes: 200 * 1024 * 1024,
  downloadTimeoutMs: 90_000,
  maxAttempts: 3,
  retryBaseDelayMs: 500,
};

export const HARD_ASSET_INGEST_CAPS = {
  maxItemsPerRun: 10,
  maxImageBytes: 40 * 1024 * 1024,
  maxVideoBytes: 200 * 1024 * 1024,
} as const;

export function resolveIngestLimits(
  overrides: Partial<AssetIngestLimits> = {},
): AssetIngestLimits {
  const maxItems = Math.min(
    HARD_ASSET_INGEST_CAPS.maxItemsPerRun,
    Math.max(
      1,
      Math.floor(
        overrides.maxItemsPerRun ?? DEFAULT_ASSET_INGEST_LIMITS.maxItemsPerRun,
      ),
    ),
  );

  return {
    ...DEFAULT_ASSET_INGEST_LIMITS,
    ...overrides,
    maxItemsPerRun: maxItems,
    maxImageBytes: Math.min(
      HARD_ASSET_INGEST_CAPS.maxImageBytes,
      overrides.maxImageBytes ?? DEFAULT_ASSET_INGEST_LIMITS.maxImageBytes,
    ),
    maxVideoBytes: Math.min(
      HARD_ASSET_INGEST_CAPS.maxVideoBytes,
      overrides.maxVideoBytes ?? DEFAULT_ASSET_INGEST_LIMITS.maxVideoBytes,
    ),
  };
}
