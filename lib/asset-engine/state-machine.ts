import type { AssetProcessingStatus } from "./types";

const TRANSITIONS: Record<AssetProcessingStatus, AssetProcessingStatus[]> = {
  pending_download: ["downloaded", "failed"],
  downloaded: ["processed", "failed"],
  processed: ["ready_for_review", "failed"],
  ready_for_review: [],
  failed: ["pending_download"],
};

export function canTransition(
  from: AssetProcessingStatus,
  to: AssetProcessingStatus,
): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(
  from: AssetProcessingStatus,
  to: AssetProcessingStatus,
): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid asset processing transition: ${from} → ${to}`);
  }
}

/** Terminal success state for Phase 2A (still unpublished). */
export function isReadyForReview(status: AssetProcessingStatus): boolean {
  return status === "ready_for_review";
}

export function isRetryableStatus(status: AssetProcessingStatus): boolean {
  return status === "failed" || status === "pending_download";
}

export function isAlreadyProcessed(status: AssetProcessingStatus): boolean {
  return status === "processed" || status === "ready_for_review";
}

export const PROCESSING_STATUS_ORDER: AssetProcessingStatus[] = [
  "pending_download",
  "downloaded",
  "processed",
  "ready_for_review",
  "failed",
];
