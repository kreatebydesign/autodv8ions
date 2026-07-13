"use client";

import type { BulkReviewAction } from "@/lib/live-portfolio/review-bulk";

export default function ReviewBulkToolbar({
  selectedCount,
  filteredCount,
  busy,
  onSelectAll,
  onClear,
  onPublish,
  onArchive,
  onPin,
  onUnpin,
  onRestore,
  onAnalyze,
  onEdit,
  onPreview,
}: {
  selectedCount: number;
  filteredCount: number;
  busy: boolean;
  onSelectAll: () => void;
  onClear: () => void;
  onPublish: () => void;
  onArchive: () => void;
  onPin: () => void;
  onUnpin: () => void;
  onRestore: () => void;
  onAnalyze: () => void;
  onEdit: () => void;
  onPreview: () => void;
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="review-bulk-toolbar" role="toolbar" aria-label="Bulk actions">
      <div className="review-bulk-toolbar-main">
        <p className="review-bulk-count">
          <strong>{selectedCount}</strong> selected
          {filteredCount > selectedCount ? (
            <span className="review-bulk-count-muted">
              {" "}
              · {filteredCount} visible
            </span>
          ) : null}
        </p>
        <div className="review-bulk-toolbar-actions">
          <button
            type="button"
            className="review-btn review-btn-soft"
            disabled={busy}
            onClick={onPreview}
          >
            Quick preview
          </button>
          <button
            type="button"
            className="review-btn review-btn-soft"
            disabled={busy}
            onClick={onEdit}
          >
            Edit selected
          </button>
          <button
            type="button"
            className="review-btn review-btn-soft"
            disabled={busy}
            onClick={onAnalyze}
          >
            Analyze
          </button>
          <button
            type="button"
            className="review-btn review-btn-soft"
            disabled={busy}
            onClick={onPublish}
          >
            Publish
          </button>
          <button
            type="button"
            className="review-btn review-btn-soft"
            disabled={busy}
            onClick={onPin}
          >
            Pin
          </button>
          <button
            type="button"
            className="review-btn review-btn-soft"
            disabled={busy}
            onClick={onUnpin}
          >
            Unpin
          </button>
          <button
            type="button"
            className="review-btn review-btn-soft"
            disabled={busy}
            onClick={onRestore}
          >
            Restore
          </button>
          <button
            type="button"
            className="review-btn review-btn-ghost"
            disabled={busy}
            onClick={onArchive}
          >
            Archive
          </button>
        </div>
      </div>
      <div className="review-bulk-toolbar-secondary">
        <button
          type="button"
          className="review-btn review-btn-ghost"
          disabled={busy}
          onClick={onSelectAll}
        >
          Select all visible
        </button>
        <button
          type="button"
          className="review-btn review-btn-ghost"
          disabled={busy}
          onClick={onClear}
        >
          Clear
        </button>
      </div>
    </div>
  );
}

export function bulkActionLabel(action: BulkReviewAction) {
  switch (action) {
    case "publish":
      return "publish";
    case "archive":
      return "archive";
    case "pin":
      return "pin";
    case "unpin":
      return "unpin";
    case "restore":
      return "restore";
    case "save":
      return "save";
    case "analyze":
      return "analyze";
    default:
      return action;
  }
}
