"use client";

import { useEffect, useState } from "react";
import type { PortfolioEngineStats } from "@/lib/portfolio-engine";

function formatBytes(bytes: number) {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export default function PortfolioSettingsClient({
  initialStats,
}: {
  initialStats: PortfolioEngineStats;
}) {
  const [stats, setStats] = useState(initialStats);
  const [reviewQueueLimit, setReviewQueueLimit] = useState(
    String(initialStats.limits.reviewQueueLimit),
  );
  const [liveShowcaseLimit, setLiveShowcaseLimit] = useState(
    String(initialStats.limits.liveShowcaseLimit),
  );
  const [homepageLimit, setHomepageLimit] = useState(
    String(initialStats.limits.homepageLimit),
  );
  const [pinnedLimit, setPinnedLimit] = useState(
    String(initialStats.limits.pinnedLimit),
  );
  const [retentionDays, setRetentionDays] = useState(
    String(initialStats.limits.retentionDays),
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setStats(initialStats);
  }, [initialStats]);

  async function saveLimits() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/portfolio/settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewQueueLimit: Number(reviewQueueLimit),
          liveShowcaseLimit: Number(liveShowcaseLimit),
          homepageLimit: Number(homepageLimit),
          pinnedLimit: Number(pinnedLimit),
          retentionDays: Number(retentionDays),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessage(data.error || "Unable to save settings.");
        return;
      }
      setStats(data.stats);
      setMessage("Portfolio settings saved.");
    } catch {
      setMessage("Network error while saving settings.");
    } finally {
      setBusy(false);
    }
  }

  async function runCleanup(dryRun: boolean) {
    if (!dryRun) {
      const confirmed = window.confirm(
        "Delete private Blob files for cleanup-eligible archived projects?\n\nDrive originals, gallery records, and editorial fields are kept. This cannot be undone without reprocessing from Drive.",
      );
      if (!confirmed) return;
    }

    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/portfolio/cleanup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun, limit: 40 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage("Cleanup request failed.");
        return;
      }
      setMessage(
        `${dryRun ? "Dry run (no deletes)" : "Cleanup complete"}: ${data.eligibleItems} items · ${data.mediaTouched} media · ${data.pathnamesDeleted} blob paths${
          data.errors?.length ? ` · ${data.errors.length} errors` : ""
        }.`,
      );
      const refresh = await fetch("/api/portfolio/settings", {
        credentials: "include",
      });
      const refreshData = await refresh.json();
      if (refresh.ok && refreshData.stats) setStats(refreshData.stats);
    } catch {
      setMessage("Network error during cleanup.");
    } finally {
      setBusy(false);
    }
  }

  async function trimQueue() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/portfolio/lifecycle", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trim_queue" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessage(data.error || "Unable to trim review queue.");
        return;
      }
      setMessage(
        `Review queue trimmed. Archived ${data.archivedIds?.length ?? 0} overflow items.`,
      );
      const refresh = await fetch("/api/portfolio/settings", {
        credentials: "include",
      });
      const refreshData = await refresh.json();
      if (refresh.ok && refreshData.stats) setStats(refreshData.stats);
    } catch {
      setMessage("Network error while trimming queue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          ["Review Queue", stats.reviewQueueCount],
          ["Published", stats.publishedCount],
          ["Pinned", stats.pinnedCount],
          ["Archived", stats.archivedCount],
          ["Cleanup Eligible", stats.cleanupEligibleCount],
          ["Blob Estimate", formatBytes(stats.blobBytesEstimate)],
        ].map(([label, value]) => (
          <div key={label} className="admin-panel px-5 py-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--dv8-muted)]">
              {label}
            </p>
            <p className="mt-3 text-3xl font-light tracking-tight">{value}</p>
          </div>
        ))}
      </div>

      <section className="admin-panel space-y-5 px-5 py-6">
        <div>
          <h2 className="text-lg font-light">Showcase limits</h2>
        <p className="mt-2 max-w-2xl text-sm text-[var(--dv8-muted)]">
          Configurable KXD Portfolio Engine defaults. Drive stays the
          permanent archive; the website stays a curated rolling showcase.
          Use dry-run before any Blob cleanup.
        </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="admin-label">Review Queue Limit</label>
            <input
              className="admin-input"
              type="number"
              min={1}
              value={reviewQueueLimit}
              onChange={(e) => setReviewQueueLimit(e.target.value)}
            />
          </div>
          <div>
            <label className="admin-label">Live Showcase Limit</label>
            <input
              className="admin-input"
              type="number"
              min={1}
              value={liveShowcaseLimit}
              onChange={(e) => setLiveShowcaseLimit(e.target.value)}
            />
          </div>
          <div>
            <label className="admin-label">Homepage Limit</label>
            <input
              className="admin-input"
              type="number"
              min={1}
              value={homepageLimit}
              onChange={(e) => setHomepageLimit(e.target.value)}
            />
          </div>
          <div>
            <label className="admin-label">Pinned Projects</label>
            <input
              className="admin-input"
              type="number"
              min={1}
              value={pinnedLimit}
              onChange={(e) => setPinnedLimit(e.target.value)}
            />
          </div>
          <div>
            <label className="admin-label">Retention Period (days)</label>
            <input
              className="admin-input"
              type="number"
              min={1}
              value={retentionDays}
              onChange={(e) => setRetentionDays(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            disabled={busy}
            onClick={saveLimits}
          >
            Save settings
          </button>
          <button
            type="button"
            className="admin-btn"
            disabled={busy}
            onClick={trimQueue}
          >
            Trim Review Queue
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            disabled={busy}
            onClick={() => runCleanup(true)}
          >
            Dry-run Blob Cleanup
          </button>
          <button
            type="button"
            className="admin-btn"
            disabled={busy}
            onClick={() => runCleanup(false)}
            title="Requires confirmation. Prefer dry-run first."
          >
            Run Blob Cleanup
          </button>
        </div>

        {message && (
          <p className="text-sm text-[var(--dv8-muted)]">{message}</p>
        )}
      </section>
    </div>
  );
}
