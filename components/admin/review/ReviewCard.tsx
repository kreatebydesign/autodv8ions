"use client";

import Link from "next/link";
import type { ReviewCardItem } from "@/lib/live-portfolio/review-data";
import { formatDate } from "@/lib/utils/format";

function statusLabel(item: ReviewCardItem) {
  if (item.published) return "Published";
  if (item.processingFailedCount > 0) return "Needs attention";
  if (item.processingReadyCount > 0 && item.processingPendingCount === 0) {
    return "Ready for review";
  }
  if (item.processingPendingCount > 0) return "Processing";
  return item.status === "pending" ? "Pending" : item.status;
}

function statusTone(item: ReviewCardItem) {
  if (item.published) return "review-badge-muted";
  if (item.processingFailedCount > 0) return "review-badge-warn";
  if (item.processingReadyCount > 0) return "review-badge-ready";
  return "review-badge-soft";
}

export default function ReviewCard({ item }: { item: ReviewCardItem }) {
  const coverSrc = item.coverMediaId
    ? `/api/content/media-file/${item.coverMediaId}?variant=medium`
    : null;

  return (
    <article className="review-card group">
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
          <span className={`review-badge ${statusTone(item)}`}>
            {statusLabel(item)}
          </span>
        </div>

        <div className="review-card-body">
          <div className="min-w-0 flex-1">
            <h2 className="review-card-title">{item.vehicle}</h2>
            <p className="review-card-meta">
              {item.workDate ? formatDate(item.workDate) : "Date needs review"}
              {item.sourceMonthFolderName
                ? ` · ${item.sourceMonthFolderName}`
                : ""}
            </p>
            <p className="review-card-counts">
              {item.imageCount} image{item.imageCount === 1 ? "" : "s"}
              {item.videoCount > 0
                ? ` · ${item.videoCount} video${item.videoCount === 1 ? "" : "s"}`
                : ""}
              {item.provisionalVehicle ? " · Provisional" : ""}
            </p>
          </div>
          <span className="admin-btn admin-btn-primary review-card-cta">
            Review
          </span>
        </div>
      </Link>
    </article>
  );
}
