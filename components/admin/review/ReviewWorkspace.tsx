"use client";

import { useMemo, useState } from "react";
import type { ReviewCardItem } from "@/lib/live-portfolio/review-data";
import ReviewCard from "./ReviewCard";

type SortMode = "newest" | "oldest";
type StatusFilter =
  | "all"
  | "pending"
  | "ready"
  | "processing"
  | "failed"
  | "published";

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
      initialItems.filter((item) => !item.published && item.status === "pending")
        .length,
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
        if (status === "pending")
          return !item.published && item.status === "pending";
        if (status === "ready")
          return (
            !item.published &&
            item.processingReadyCount > 0 &&
            item.processingPendingCount === 0 &&
            item.processingFailedCount === 0
          );
        if (status === "processing") return item.processingPendingCount > 0;
        if (status === "failed") return item.processingFailedCount > 0;
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
    <div className="review-workspace space-y-8">
      <header className="review-workspace-header">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--dv8-muted)]">
            Portfolio
          </p>
          <h1 className="mt-2 text-[clamp(2rem,4vw,3.25rem)] font-light tracking-tight">
            Review Workspace
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--dv8-muted)]">
            A photography-first queue for pending window tint work. Nothing
            publishes from this screen.
          </p>
        </div>
        <div className="review-count-pill">
          <span className="review-count-number">{pendingCount}</span>
          <span className="review-count-label">Pending review</span>
        </div>
      </header>

      <div className="review-toolbar">
        <input
          className="admin-input review-search"
          placeholder="Search vehicle, slug, folder…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="admin-input"
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
          className="admin-input"
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="ready">Ready for review</option>
          <option value="processing">Processing</option>
          <option value="failed">Failed media</option>
          <option value="published">Published</option>
        </select>
        <select
          className="admin-input"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          aria-label="Sort order"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
        <button
          type="button"
          className="admin-btn"
          disabled
          title="Available in a later publishing phase"
        >
          Publish Selected
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="review-empty">
          <p>No gallery items match these filters.</p>
          <p className="mt-2 text-sm text-[var(--dv8-muted)]">
            Import pending jobs from Content, then process media to populate
            covers.
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
