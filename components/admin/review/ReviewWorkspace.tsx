"use client";

import { useMemo, useState } from "react";
import type { ReviewCardItem } from "@/lib/live-portfolio/review-data";
import { isReviewQueueStatus } from "@/lib/portfolio-engine/types";
import ReviewCard from "./ReviewCard";

type SortMode = "newest" | "oldest";
type StatusFilter =
  | "all"
  | "pending"
  | "ready"
  | "processing"
  | "failed"
  | "published"
  | "archived"
  | "pinned";

export default function ReviewWorkspace({
  initialItems,
}: {
  initialItems: ReviewCardItem[];
}) {
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortMode>("newest");

  const months = useMemo(() => {
    const set = new Set<string>();
    for (const item of initialItems) {
      if (item.sourceMonthFolderName) set.add(item.sourceMonthFolderName);
    }
    return [...set].sort().reverse();
  }, [initialItems]);

  const pendingCount = useMemo(
    () =>
      initialItems.filter(
        (item) => !item.published && isReviewQueueStatus(item.status),
      ).length,
    [initialItems],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...initialItems];

    if (q) {
      list = list.filter(
        (item) =>
          item.vehicle.toLowerCase().includes(q) ||
          item.slug.toLowerCase().includes(q) ||
          (item.driveFolderName || "").toLowerCase().includes(q),
      );
    }

    if (month !== "all") {
      list = list.filter((item) => item.sourceMonthFolderName === month);
    }

    if (status !== "all") {
      list = list.filter((item) => {
        if (status === "published") return item.published;
        if (status === "pinned") return item.pinned;
        if (status === "archived")
          return (
            item.status === "archived" || item.status === "archived_review"
          );
        if (status === "pending")
          return !item.published && isReviewQueueStatus(item.status);
        if (status === "ready")
          return (
            !item.published &&
            item.processingReadyCount > 0 &&
            item.processingPendingCount === 0 &&
            item.processingFailedCount === 0
          );
        if (status === "processing") return item.processingPendingCount > 0;
        if (status === "failed")
          return (
            item.processingFailedCount > 0 || item.status === "failed"
          );
        return true;
      });
    }

    list.sort((a, b) => {
      const aTime = Date.parse(a.workDate || a.createdAt || "") || 0;
      const bTime = Date.parse(b.workDate || b.createdAt || "") || 0;
      return sort === "newest" ? bTime - aTime : aTime - bTime;
    });

    return list;
  }, [initialItems, query, month, status, sort]);

  return (
    <div className="review-workspace">
      <header className="review-workspace-header">
        <div className="review-workspace-intro">
          <p className="review-eyebrow">Portfolio</p>
          <h1 className="review-workspace-title">Review Workspace</h1>
          <p className="review-workspace-lede">
            Curate a rolling showcase. Publish rotates the live set; Drive
            remains the permanent archive.
          </p>
        </div>
        <div className="review-count-pill">
          <span className="review-count-number">{pendingCount}</span>
          <span className="review-count-label">In queue</span>
        </div>
      </header>

      <div className="review-toolbar">
        <input
          className="review-field review-search"
          placeholder="Search vehicle…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="review-field"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          aria-label="Filter by month"
        >
          <option value="all">All months</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          className="review-field"
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="pending">Review queue</option>
          <option value="ready">Ready</option>
          <option value="processing">Processing</option>
          <option value="failed">Needs attention</option>
          <option value="published">Published</option>
          <option value="pinned">Pinned</option>
          <option value="archived">Archived</option>
        </select>
        <select
          className="review-field"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          aria-label="Sort order"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
        <button
          type="button"
          className="review-btn review-btn-ghost"
          disabled
          title="Batch publish arrives in a later phase"
        >
          Publish Selected
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="review-empty">
          <p className="review-empty-title">Nothing matches</p>
          <p className="review-empty-copy">
            Adjust filters, or import and process new work to fill this space.
          </p>
        </div>
      ) : (
        <div className="review-grid">
          {filtered.map((item) => (
            <ReviewCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
