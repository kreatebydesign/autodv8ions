"use client";

import Link from "next/link";
import type { ReviewCardItem } from "@/lib/live-portfolio/review-data";
import { formatDate } from "@/lib/utils/format";

function recommendationLabel(value: string) {
  switch (value) {
    case "homepage_feature":
      return "Homepage-worthy";
    case "publish":
      return "Recommended";
    case "publish_if_needed":
      return "Publish if needed";
    default:
      return null;
  }
}

export default function ReviewQuickPreview({
  item,
  onClose,
  onOpenDetail,
}: {
  item: ReviewCardItem | null;
  onClose: () => void;
  onOpenDetail: () => void;
}) {
  if (!item) return null;

  const coverSrc = item.coverMediaId
    ? `/api/content/media-file/${item.coverMediaId}?variant=large`
    : null;

  return (
    <aside className="review-quick-preview" aria-label="Quick preview">
      <div className="review-quick-preview-head">
        <p className="review-panel-kicker">Quick preview</p>
        <button
          type="button"
          className="review-btn review-btn-ghost"
          onClick={onClose}
          aria-label="Close preview"
        >
          Close
        </button>
      </div>

      <div className="review-quick-preview-media">
        {coverSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverSrc} alt={item.vehicle} className="review-quick-preview-image" />
        ) : (
          <div className="review-quick-preview-placeholder">{item.vehicle}</div>
        )}
      </div>

      <div className="review-quick-preview-body">
        <h2 className="review-quick-preview-title">{item.vehicle}</h2>
        <p className="review-quick-preview-meta">
          {item.workDate ? formatDate(item.workDate) : "Date needs review"}
          {item.shadePercentage ? ` · ${item.shadePercentage}` : ""}
        </p>
        <p className="review-quick-preview-meta">
          {item.imageCount} image{item.imageCount === 1 ? "" : "s"}
          {item.videoCount > 0
            ? ` · ${item.videoCount} video${item.videoCount === 1 ? "" : "s"}`
            : ""}
        </p>

        {item.intelligence && !item.intelligence.ignored && (
          <div className="review-quick-preview-intel">
            <span className="review-intel-badge is-score">
              {item.intelligence.portfolioScore} Portfolio Score
            </span>
            {recommendationLabel(item.intelligence.recommendation) && (
              <span className="review-intel-badge is-primary">
                {recommendationLabel(item.intelligence.recommendation)}
              </span>
            )}
          </div>
        )}

        <div className="review-quick-preview-actions">
          <button
            type="button"
            className="review-btn review-btn-primary"
            onClick={onOpenDetail}
          >
            Open full review
          </button>
          <Link
            href={`/admin/review/${item.id}`}
            className="review-btn review-btn-ghost"
          >
            Open in workspace
          </Link>
        </div>
      </div>
    </aside>
  );
}
