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

function categoryLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusLabel(item: ReviewCardItem) {
  if (item.pinned && item.published) return "Pinned";
  if (item.published) return "Published";
  if (item.status === "archived" || item.status === "archived_review") {
    return "Archived";
  }
  if (item.status === "failed") return "Failed";
  if (item.processingFailedCount > 0) return "Needs attention";
  if (item.processingReadyCount > 0 && item.processingPendingCount === 0) {
    return "Ready";
  }
  if (item.processingPendingCount > 0) return "Processing";
  if (item.status === "draft") return "Draft";
  return "Pending";
}

function statusTone(item: ReviewCardItem) {
  if (item.published) return "review-badge-muted";
  if (item.processingFailedCount > 0) return "review-badge-warn";
  if (item.processingReadyCount > 0) return "review-badge-ready";
  return "review-badge-soft";
}

export default function ReviewCard({
  item,
  selected = false,
  onToggleSelect,
  onQuickPreview,
}: {
  item: ReviewCardItem;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  onQuickPreview?: (item: ReviewCardItem) => void;
}) {
  const coverSrc = item.coverMediaId
    ? `/api/content/media-file/${item.coverMediaId}?variant=medium`
    : null;

  return (
    <article className={`review-card group ${selected ? "is-selected" : ""}`}>
      <div className="review-card-shell">
        <label className="review-card-select">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect?.(item.id)}
            aria-label={`Select ${item.vehicle}`}
          />
          <span className="review-card-select-box" />
        </label>

        <button
          type="button"
          className="review-card-preview-btn"
          onClick={() => onQuickPreview?.(item)}
          aria-label={`Quick preview ${item.vehicle}`}
        >
          Preview
        </button>

        <Link href={`/admin/review/${item.id}`} className="review-card-link">
          <div className="review-card-media">
            {coverSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverSrc}
                alt={item.vehicle}
                className="review-card-image"
                loading="lazy"
              />
            ) : (
              <div className="review-card-placeholder">
                <span>{item.vehicle.slice(0, 1).toUpperCase()}</span>
              </div>
            )}
            <div className="review-card-veil" />
            <div className="review-card-glow" />
            <span className={`review-badge ${statusTone(item)}`}>
              {statusLabel(item)}
            </span>
            {item.intelligence && !item.intelligence.ignored && (
              <div className="review-card-intelligence">
                <span className="review-intel-badge is-score">
                  {item.intelligence.portfolioScore} Portfolio Score
                </span>
                {recommendationLabel(item.intelligence.recommendation) && (
                  <span className="review-intel-badge is-primary">
                    {recommendationLabel(item.intelligence.recommendation)}
                  </span>
                )}
                <span className="review-intel-badge">
                  {categoryLabel(item.intelligence.vehicleCategory)}
                </span>
                {item.intelligence.portfolioScore >= 75 && (
                  <span className="review-intel-badge">Strong photography</span>
                )}
              </div>
            )}
          </div>

          <div className="review-card-body">
            <div className="min-w-0 flex-1">
              <h2 className="review-card-title">{item.vehicle}</h2>
              <p className="review-card-meta">
                {item.workDate ? formatDate(item.workDate) : "Date needs review"}
              </p>
              <p className="review-card-counts">
                {item.imageCount} image{item.imageCount === 1 ? "" : "s"}
                {item.videoCount > 0
                  ? ` · ${item.videoCount} video${item.videoCount === 1 ? "" : "s"}`
                  : ""}
                {item.provisionalVehicle ? " · Provisional" : ""}
              </p>
            </div>
            <span className="review-card-cta">Review</span>
          </div>
        </Link>
      </div>
    </article>
  );
}
