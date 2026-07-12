import type { AssetIngestJobInput, AssetIngestJobResult } from "./ingest";
import { ingestAssetObject } from "./ingest";
import type { SourceConnector } from "../source/types";
import type { StorageProvider } from "../storage/types";
import { resolveIngestLimits } from "../limits";
import type { AssetIngestLimits } from "../types";

/**
 * Processing service / job runner.
 * Currently synchronous; shaped for future cron, queues, and workers.
 */
export type ProcessingJobBatch = {
  jobs: AssetIngestJobInput[];
  limits?: Partial<AssetIngestLimits>;
};

export type ProcessingBatchResult = {
  mode: "synchronous";
  processed: number;
  skipped: number;
  failed: number;
  results: AssetIngestJobResult[];
  limits: AssetIngestLimits;
};

export async function runProcessingBatch(input: {
  batch: ProcessingJobBatch;
  source: SourceConnector;
  storage: StorageProvider;
}): Promise<ProcessingBatchResult> {
  const limits = resolveIngestLimits(input.batch.limits);
  const jobs = input.batch.jobs.slice(0, limits.maxItemsPerRun);
  const results: AssetIngestJobResult[] = [];

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const job of jobs) {
    const result = await ingestAssetObject({
      job,
      source: input.source,
      storage: input.storage,
      limits,
    });
    results.push(result);
    if (!result.ok) failed += 1;
    else if (result.skipped) skipped += 1;
    else processed += 1;
  }

  return {
    mode: "synchronous",
    processed,
    skipped,
    failed,
    results,
    limits,
  };
}

/** Future entrypoint for cron / queue workers. */
export async function runProcessingWorkerTick(input: {
  claimJobs: () => Promise<AssetIngestJobInput[]>;
  source: SourceConnector;
  storage: StorageProvider;
  limits?: Partial<AssetIngestLimits>;
}): Promise<ProcessingBatchResult> {
  const jobs = await input.claimJobs();
  return runProcessingBatch({
    batch: { jobs, limits: input.limits },
    source: input.source,
    storage: input.storage,
  });
}
