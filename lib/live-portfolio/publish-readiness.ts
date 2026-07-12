/** Client-safe readiness check for Review Workspace publish controls. */
export function itemIsReadyForPublish(item: {
  processingReadyCount: number;
  processingPendingCount: number;
  processingFailedCount: number;
  imageCount: number;
}) {
  return (
    item.processingReadyCount > 0 &&
    item.processingPendingCount === 0 &&
    item.processingFailedCount === 0 &&
    item.imageCount > 0
  );
}
