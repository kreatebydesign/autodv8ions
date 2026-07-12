/**
 * KXD Asset Engine — public surface
 *
 * Reusable media ingestion infrastructure.
 * AutoDV8ions Live Portfolio is the first production consumer.
 */

export * from "./types";
export * from "./state-machine";
export * from "./bytes";
export * from "./checksum";
export * from "./retry";
export * from "./limits";
export * from "./storage";
export * from "./source";
export {
  processImageBuffer,
  buildVariantRecord,
  variantPathname,
  webSafeMasterPathname,
} from "./processing/image";
export {
  collectVideoMetadata,
  assertNoVideoTranscode,
} from "./processing/video";
export {
  IMAGE_VARIANT_MAX_EDGE,
  IMAGE_VARIANT_ORDER,
  isHeicMime,
  isImageMime,
  isVideoMime,
  DERIVED_IMAGE_MIME,
} from "./processing/variants";
export {
  ingestAssetObject,
  buildAssetBasePath,
  buildOriginalPathname,
} from "./pipeline/ingest";
export type { AssetIngestJobInput, AssetIngestJobResult } from "./pipeline/ingest";
export {
  runProcessingBatch,
  runProcessingWorkerTick,
} from "./pipeline/runner";
export type {
  ProcessingJobBatch,
  ProcessingBatchResult,
} from "./pipeline/runner";
