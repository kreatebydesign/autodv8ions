/**
 * KXD Portfolio Engine lifecycle statuses for gallery_items.
 * Drive remains the archive; the website is a curated showcase.
 */
export type PortfolioLifecycleStatus =
  | "pending_review"
  | "draft"
  | "published"
  | "archived"
  | "archived_review"
  | "failed";

/** Statuses that occupy Review Queue capacity. */
export const REVIEW_QUEUE_STATUSES: PortfolioLifecycleStatus[] = [
  "pending_review",
  "draft",
];

/** Statuses considered part of the live public showcase. */
export const LIVE_SHOWCASE_STATUSES: PortfolioLifecycleStatus[] = [
  "published",
];

export function isReviewQueueStatus(status: string | null | undefined) {
  return (
    status === "pending_review" ||
    status === "draft" ||
    status === "pending" // legacy
  );
}

export function isLivePublishedStatus(status: string | null | undefined) {
  return status === "published" || status === "approved"; // legacy approved + published bool
}

export function normalizeLifecycleStatus(
  status: string | null | undefined,
  published: boolean,
): PortfolioLifecycleStatus {
  if (status === "pending_review") return "pending_review";
  if (status === "draft") return "draft";
  if (status === "published") return "published";
  if (status === "archived") return "archived";
  if (status === "archived_review") return "archived_review";
  if (status === "failed" || status === "rejected") return "failed";
  if (status === "approved") return published ? "published" : "draft";
  if (status === "pending") return "pending_review";
  return published ? "published" : "pending_review";
}
