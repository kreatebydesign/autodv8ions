"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReviewCardItem } from "@/lib/live-portfolio/review-data";
import type { BulkReviewAction } from "@/lib/live-portfolio/review-bulk";
import { isReviewQueueStatus } from "@/lib/portfolio-engine/types";
import ReviewBulkEditPanel from "./ReviewBulkEditPanel";
import ReviewBulkToolbar from "./ReviewBulkToolbar";
import ReviewCard from "./ReviewCard";
import ReviewQuickPreview from "./ReviewQuickPreview";

type SortMode = "newest" | "oldest" | "score";
type StatusFilter =
  | "all"
  | "pending"
  | "ready"
  | "processing"
  | "failed"
  | "published"
  | "archived"
  | "pinned";

type IntelligenceFilter =
  | "all"
  | "homepage_feature"
  | "recommended"
  | "strong"
  | "score_90"
  | "needs_analysis";

const RENDER_CHUNK = 48;

function matchesIntelligenceFilter(
  item: ReviewCardItem,
  filter: IntelligenceFilter,
) {
  if (filter === "all") return true;
  const intel = item.intelligence;
  if (filter === "needs_analysis") return !intel || intel.ignored;
  if (!intel || intel.ignored) return false;
  if (filter === "homepage_feature") {
    return intel.recommendation === "homepage_feature";
  }
  if (filter === "recommended") {
    return (
      intel.recommendation === "publish" ||
      intel.recommendation === "publish_if_needed" ||
      intel.recommendation === "homepage_feature"
    );
  }
  if (filter === "strong") return intel.portfolioScore >= 75;
  if (filter === "score_90") return intel.portfolioScore >= 90;
  return true;
}

export default function ReviewWorkspace({
  initialItems,
}: {
  initialItems: ReviewCardItem[];
}) {
  const router = useRouter();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [intelligenceFilter, setIntelligenceFilter] =
    useState<IntelligenceFilter>("all");
  const [sort, setSort] = useState<SortMode>("newest");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewItem, setPreviewItem] = useState<ReviewCardItem | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [renderLimit, setRenderLimit] = useState(RENDER_CHUNK);
  const [analyzeBusy, setAnalyzeBusy] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

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

    if (intelligenceFilter !== "all") {
      list = list.filter((item) =>
        matchesIntelligenceFilter(item, intelligenceFilter),
      );
    }

    list.sort((a, b) => {
      if (sort === "score") {
        const aScore = a.intelligence?.portfolioScore ?? -1;
        const bScore = b.intelligence?.portfolioScore ?? -1;
        return bScore - aScore;
      }
      const aTime = Date.parse(a.workDate || a.createdAt || "") || 0;
      const bTime = Date.parse(b.workDate || b.createdAt || "") || 0;
      return sort === "newest" ? bTime - aTime : aTime - bTime;
    });

    return list;
  }, [initialItems, query, month, status, intelligenceFilter, sort]);

  const visibleItems = useMemo(
    () => filtered.slice(0, renderLimit),
    [filtered, renderLimit],
  );

  const selectedItems = useMemo(
    () => initialItems.filter((item) => selectedIds.has(item.id)),
    [initialItems, selectedIds],
  );

  useEffect(() => {
    setRenderLimit(RENDER_CHUNK);
  }, [query, month, status, intelligenceFilter, sort]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || renderLimit >= filtered.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setRenderLimit((current) =>
            Math.min(current + RENDER_CHUNK, filtered.length),
          );
        }
      },
      { rootMargin: "600px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [filtered.length, renderLimit]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "Escape") {
        setPreviewItem(null);
        setBulkEditOpen(false);
        if (selectedIds.size > 0) {
          setSelectedIds(new Set());
        }
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setSelectedIds(new Set(filtered.map((item) => item.id)));
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filtered, selectedIds.size]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  async function runBulkAction(
    action: BulkReviewAction,
    options?: { confirm?: boolean; fields?: Record<string, string | null> },
  ) {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    setBulkBusy(true);
    setStatusMessage("");
    try {
      const res = await fetch("/api/portfolio/review/bulk", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids,
          action,
          confirm: options?.confirm,
          fields: options?.fields,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatusMessage(data.error || `Unable to bulk ${action} selected projects.`);
        return;
      }
      setStatusMessage(
        `${data.succeeded}/${data.total} project(s) ${action}${data.failed ? ` · ${data.failed} failed` : ""}.`,
      );
      if (action !== "save") {
        setSelectedIds(new Set());
      }
      setBulkEditOpen(false);
      router.refresh();
    } catch {
      setStatusMessage(`Network error during bulk ${action}.`);
    } finally {
      setBulkBusy(false);
    }
  }

  async function analyzeReviewQueue() {
    setAnalyzeBusy(true);
    setStatusMessage("");
    try {
      const res = await fetch("/api/portfolio/intelligence/analyze", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedIds.size > 0 ? [...selectedIds] : undefined,
          maxItems: selectedIds.size > 0 ? selectedIds.size : 12,
          force: selectedIds.size > 0,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatusMessage(data.error || "Unable to analyze review queue.");
        return;
      }
      setStatusMessage(
        selectedIds.size > 0
          ? `Analyzed ${data.analyzed ?? data.succeeded ?? 0} selected project(s).`
          : `Analyzed ${data.analyzed} project(s)${data.skipped ? ` · skipped ${data.skipped} fresh cache hit(s)` : ""}.`,
      );
      router.refresh();
    } catch {
      setStatusMessage("Network error while analyzing review queue.");
    } finally {
      setAnalyzeBusy(false);
    }
  }

  function openQuickPreview() {
    const first =
      selectedItems[0] ||
      (previewItem ? previewItem : null) ||
      filtered[0] ||
      null;
    setPreviewItem(first);
  }

  return (
    <div className={`review-workspace ${selectedIds.size > 0 ? "has-selection" : ""}`}>
      <header className="review-workspace-header">
        <div className="review-workspace-intro">
          <p className="review-eyebrow">Portfolio</p>
          <h1 className="review-workspace-title">Review Workspace</h1>
          <p className="review-workspace-lede">
            Curate at scale with bulk selection, AI recommendations, and
            photography-first quick preview.
          </p>
        </div>
        <div className="review-count-pill">
          <span className="review-count-number">{pendingCount}</span>
          <span className="review-count-label">In queue</span>
        </div>
      </header>

      <div className="review-toolbar review-toolbar-bulk">
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
          value={intelligenceFilter}
          onChange={(e) =>
            setIntelligenceFilter(e.target.value as IntelligenceFilter)
          }
          aria-label="Filter by AI recommendation"
        >
          <option value="all">All AI signals</option>
          <option value="homepage_feature">Homepage-worthy</option>
          <option value="recommended">Recommended</option>
          <option value="strong">Strong photography (75+)</option>
          <option value="score_90">Exceptional (90+)</option>
          <option value="needs_analysis">Needs analysis</option>
        </select>
        <select
          className="review-field"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          aria-label="Sort order"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="score">Portfolio score</option>
        </select>
        <button
          type="button"
          className="review-btn review-btn-primary"
          disabled={analyzeBusy || bulkBusy}
          onClick={analyzeReviewQueue}
        >
          {analyzeBusy
            ? "Analyzing…"
            : selectedIds.size > 0
              ? "Analyze Selected"
              : "Analyze Review Queue"}
        </button>
      </div>

      <div className="review-results-meta">
        <p className="review-results-count">
          Showing {visibleItems.length.toLocaleString()} of{" "}
          {filtered.length.toLocaleString()} filtered ·{" "}
          {initialItems.length.toLocaleString()} total
        </p>
        {selectedIds.size > 0 && (
          <button
            type="button"
            className="review-btn review-btn-ghost"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear selection
          </button>
        )}
      </div>

      {statusMessage && (
        <p className="review-status-message review-toolbar-message">
          {statusMessage}
        </p>
      )}

      <div
        className={`review-workspace-body ${previewItem ? "is-preview-open" : ""}`}
      >
        {filtered.length === 0 ? (
          <div className="review-empty">
            <p className="review-empty-title">Nothing matches</p>
            <p className="review-empty-copy">
              Adjust filters, or import and process new work to fill this space.
            </p>
          </div>
        ) : (
          <>
            <div className="review-grid">
              {visibleItems.map((item) => (
                <ReviewCard
                  key={item.id}
                  item={item}
                  selected={selectedIds.has(item.id)}
                  onToggleSelect={toggleSelect}
                  onQuickPreview={setPreviewItem}
                />
              ))}
            </div>
            {renderLimit < filtered.length && (
              <div ref={sentinelRef} className="review-grid-sentinel">
                Loading more projects…
              </div>
            )}
          </>
        )}

        <ReviewQuickPreview
          item={previewItem}
          onClose={() => setPreviewItem(null)}
          onOpenDetail={() => {
            if (previewItem) {
              router.push(`/admin/review/${previewItem.id}`);
            }
          }}
        />
      </div>

      <ReviewBulkToolbar
        selectedCount={selectedIds.size}
        filteredCount={filtered.length}
        busy={bulkBusy}
        onSelectAll={() => setSelectedIds(new Set(filtered.map((item) => item.id)))}
        onClear={() => setSelectedIds(new Set())}
        onPreview={openQuickPreview}
        onEdit={() => setBulkEditOpen(true)}
        onAnalyze={() => analyzeReviewQueue()}
        onPublish={() => {
          if (
            window.confirm(
              `Publish ${selectedIds.size} selected project(s) to the live showcase?`,
            )
          ) {
            runBulkAction("publish", { confirm: true });
          }
        }}
        onArchive={() => {
          if (
            window.confirm(
              `Archive ${selectedIds.size} selected project(s)?`,
            )
          ) {
            runBulkAction("archive", { confirm: true });
          }
        }}
        onPin={() => runBulkAction("pin")}
        onUnpin={() => runBulkAction("unpin")}
        onRestore={() => runBulkAction("restore")}
      />

      {bulkEditOpen && (
        <ReviewBulkEditPanel
          selectedCount={selectedIds.size}
          busy={bulkBusy}
          onClose={() => setBulkEditOpen(false)}
          onApply={(fields) => runBulkAction("save", { fields })}
        />
      )}
    </div>
  );
}
