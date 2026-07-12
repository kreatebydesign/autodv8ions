"use client";

import { useState } from "react";
import type { PortfolioListItem } from "@/lib/types/database";
import { formatDate } from "@/lib/utils/format";

export default function ContentClient({
  initialItems,
  connected,
  message,
}: {
  initialItems: PortfolioListItem[];
  connected: boolean;
  message: string | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [importingPending, setImportingPending] = useState(false);

  async function checkDriveConnection() {
    setChecking(true);
    setStatus("");
    try {
      const res = await fetch("/api/content/drive-check", {
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok || !data.authenticated) {
        const detail = data.error?.message || data.error || "Drive check failed.";
        setStatus(`Drive check failed: ${detail}`);
        return;
      }

      const samples =
        Array.isArray(data.sampleFolderNames) && data.sampleFolderNames.length
          ? ` Sample: ${data.sampleFolderNames.join(", ")}`
          : "";

      setStatus(
        `Connected${data.authMode === "wif" ? " (OIDC / WIF)" : data.authMode === "oauth_legacy" ? " (legacy OAuth)" : ""}. Folder: ${data.rootFolderName || "—"}. Immediate folders: ${data.immediateFolderCount ?? 0}.${samples}`,
      );
    } catch {
      setStatus("Drive check failed: network or server error.");
    } finally {
      setChecking(false);
    }
  }

  async function previewDriveDiscovery() {
    setDiscovering(true);
    setStatus("");
    try {
      const res = await fetch("/api/content/drive-discovery-preview", {
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        const detail =
          data.error?.message || data.error || "Drive discovery preview failed.";
        setStatus(`Discovery preview failed: ${detail}`);
        return;
      }

      const monthSamples = Array.isArray(data.months)
        ? data.months
            .slice(0, 3)
            .map(
              (month: {
                folderName?: string;
                jobCount?: number;
                mediaCount?: number;
                parseOk?: boolean;
              }) =>
                `${month.folderName || "?"} (${month.jobCount ?? 0} jobs, ${month.mediaCount ?? 0} media${month.parseOk === false ? ", unparsed" : ""})`,
            )
            .join("; ")
        : "";

      const trunc = data.truncated
        ? [
            data.truncated.months ? "months" : null,
            data.truncated.jobs ? "jobs" : null,
            data.truncated.media ? "media" : null,
          ]
            .filter(Boolean)
            .join(", ")
        : "";

      setStatus(
        `Discovery preview (read-only${data.authMode === "wif" ? ", OIDC/WIF" : ""}): ${data.rootFolder?.name || "Tint Jobs"} · months ${data.monthFolderCount ?? 0} · jobs ${data.jobFolderCount ?? 0} · media ${data.mediaFileCount ?? 0} · ignored ${data.ignoredCount ?? 0} · warnings ${data.warningCount ?? 0}.${trunc ? ` Truncated: ${trunc}.` : ""}${monthSamples ? ` Samples: ${monthSamples}.` : ""} Nothing was imported or published.`,
      );
    } catch {
      setStatus("Discovery preview failed: network or server error.");
    } finally {
      setDiscovering(false);
    }
  }

  async function previewImportPlan() {
    setPlanning(true);
    setStatus("");
    try {
      const res = await fetch("/api/content/drive-import-plan", {
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        const detail =
          data.error?.message || data.error || "Import plan preview failed.";
        setStatus(`Import plan failed: ${detail}`);
        return;
      }

      const creates = Array.isArray(data.samples?.newGalleryItems)
        ? data.samples.newGalleryItems
            .slice(0, 3)
            .map(
              (item: {
                displayTitleCandidate?: string;
                mediaCount?: number;
              }) =>
                `${item.displayTitleCandidate || "?"} (${item.mediaCount ?? 0} media)`,
            )
            .join("; ")
        : "";

      const matches = Array.isArray(data.samples?.existingMatches)
        ? data.samples.existingMatches
            .slice(0, 2)
            .map(
              (item: {
                existingVehicle?: string;
                preserveHumanEditedMetadata?: boolean;
              }) =>
                `${item.existingVehicle || "?"}${item.preserveHumanEditedMetadata ? " [preserve]" : ""}`,
            )
            .join("; ")
        : "";

      const conflicts = data.totals?.conflictCount
        ? ` Conflicts: ${data.totals.conflictCount}.`
        : "";

      setStatus(
        `Import plan dry-run (writesPerformed=${String(data.writesPerformed)}): new items ${data.totals?.newGalleryItemCount ?? 0} · matches ${data.totals?.existingGalleryItemMatchCount ?? 0} · new media ${data.totals?.newGalleryMediaCount ?? 0} · media matches ${data.totals?.existingGalleryMediaMatchCount ?? 0} · skips ${data.totals?.skipCount ?? 0} · warnings ${data.totals?.warningCount ?? 0}.${conflicts}${creates ? ` Create samples: ${creates}.` : ""}${matches ? ` Match samples: ${matches}.` : ""} No records were written.`,
      );
    } catch {
      setStatus("Import plan failed: network or server error.");
    } finally {
      setPlanning(false);
    }
  }

  async function importRecentAsPending() {
    const confirmed = window.confirm(
      [
        "Import Recent as Pending",
        "",
        "This will CREATE database records for up to 3 newest months (max 60 jobs / 150 media).",
        "",
        "• Gallery items will be created as pending only",
        "• Nothing will publish to the website",
        "• No media files will be downloaded",
        "• No Blob uploads or public URLs",
        "",
        "Continue?",
      ].join("\n"),
    );

    if (!confirmed) {
      setStatus("Pending import cancelled — no records were written.");
      return;
    }

    setImportingPending(true);
    setStatus("");
    try {
      const res = await fetch("/api/content/drive-import-pending", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmPendingImport: true,
          maxMonths: 3,
          maxItems: 60,
          maxMedia: 150,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        const detail =
          data.error?.message || data.error || "Pending import failed.";
        setStatus(`Pending import failed: ${detail}`);
        return;
      }

      const remaining =
        data.batchLimits?.truncatedByLimits
          ? ` Remaining estimate: ~${data.batchLimits.remainingItemsEstimate ?? "?"} jobs / ~${data.batchLimits.remainingMediaEstimate ?? "?"} media across ~${data.batchLimits.remainingMonthsEstimate ?? "?"} months.`
          : "";

      setStatus(
        `Pending import complete (writesPerformed=${String(data.writesPerformed)}): created items ${data.counts?.createdGalleryItems ?? 0} · matched items ${data.counts?.matchedGalleryItems ?? 0} · created media ${data.counts?.createdMedia ?? 0} · matched media ${data.counts?.matchedMedia ?? 0} · skips ${data.counts?.skipped ?? 0} · conflicts ${data.counts?.conflicts ?? 0} · warnings ${data.counts?.warnings ?? 0}. Batch: ${data.batchLimits?.monthsSelected ?? 0} months / ${data.batchLimits?.itemsSelected ?? 0} items / ${data.batchLimits?.mediaSelected ?? 0} media.${remaining} Nothing was published; no media downloaded. Refresh the page to reload the review table.`,
      );
    } catch {
      setStatus("Pending import failed: network or server error.");
    } finally {
      setImportingPending(false);
    }
  }

  async function syncDrive(mode?: string) {
    setLoading(true);
    setStatus("");
    const res = await fetch("/api/content", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mode ? { mode } : {}),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setStatus(data.error || "Sync failed.");
      return;
    }

    const imported = data.result?.importedFolders ?? data.count ?? 0;
    setStatus(
      data.message ||
        `Imported ${imported} vehicle folder(s) for review. Nothing was published.`,
    );
    setItems(data.items || []);
  }

  const busy =
    loading || checking || discovering || planning || importingPending;

  return (
    <div className="space-y-6">
      <div className="admin-panel px-4 py-3 text-sm text-[var(--dv8-muted)]">
        {message ||
          "Sync imports Tint Jobs media for review only. It does not publish to the website."}
      </div>

      {!connected && (
        <div className="admin-panel px-4 py-3 text-sm text-[var(--dv8-muted)]">
          Google Drive is not connected yet.
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="admin-btn"
          disabled={busy}
          onClick={checkDriveConnection}
        >
          {checking ? "Checking..." : "Check Drive Connection"}
        </button>
        <button
          type="button"
          className="admin-btn"
          disabled={busy || !connected}
          onClick={previewDriveDiscovery}
        >
          {discovering ? "Discovering..." : "Preview Drive Discovery"}
        </button>
        <button
          type="button"
          className="admin-btn"
          disabled={busy || !connected}
          onClick={previewImportPlan}
        >
          {planning ? "Planning..." : "Preview Import Plan"}
        </button>
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          disabled={busy || !connected}
          onClick={() => syncDrive()}
        >
          {loading ? "Syncing..." : "Sync Recent Tint Jobs"}
        </button>
        <button
          type="button"
          className="admin-btn"
          disabled={busy || !connected}
          onClick={() => syncDrive("historical-backfill")}
          title="Explicit historical backfill — still pending review, never auto-published"
        >
          Historical Backfill (Pending Only)
        </button>
      </div>

      <div className="admin-panel space-y-3 px-4 py-4">
        <div className="text-sm font-medium text-[var(--dv8-ink)]">
          Phase 1D — Controlled pending import
        </div>
        <p className="text-sm text-[var(--dv8-muted)]">
          Creates pending gallery items and media metadata for the newest month
          folders only (max 3 months / 60 jobs / 150 media). Does not publish,
          download files, or upload to Blob. Separate from Sync buttons above.
        </p>
        <button
          type="button"
          className="admin-btn"
          disabled={busy || !connected}
          onClick={importRecentAsPending}
        >
          {importingPending ? "Importing..." : "Import Recent as Pending"}
        </button>
      </div>

      {status && (
        <div className="admin-panel px-4 py-3 text-sm text-[var(--dv8-muted)]">
          {status}
        </div>
      )}

      <div className="admin-panel overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Vehicle</th>
              <th>Work Date</th>
              <th>Source Folder</th>
              <th>Month</th>
              <th>Images</th>
              <th>Videos</th>
              <th>Warnings</th>
              <th>Scope</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-[var(--dv8-muted)]">
                  No portfolio items yet. Run a sync to import Tint Jobs for review.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className="uppercase tracking-[0.12em] text-xs">
                      {item.status}
                    </span>
                    {item.provisional_vehicle && item.status === "pending" ? (
                      <span className="mt-1 block text-[11px] text-[var(--dv8-muted)]">
                        Provisional
                      </span>
                    ) : null}
                  </td>
                  <td>
                    {item.vehicle || "—"}
                    {item.provisional_vehicle ? (
                      <span className="mt-1 block text-[11px] text-[var(--dv8-muted)]">
                        Confirm before approval
                      </span>
                    ) : null}
                  </td>
                  <td>
                    {item.work_date ? formatDate(item.work_date) : "—"}
                    {!item.work_date ? (
                      <span className="mt-1 block text-[11px] text-[var(--dv8-muted)]">
                        Needs review
                      </span>
                    ) : null}
                  </td>
                  <td className="text-sm text-[var(--dv8-muted)]">
                    {item.drive_folder_name || "—"}
                  </td>
                  <td className="text-sm text-[var(--dv8-muted)]">
                    {item.source_month_folder_name || "—"}
                  </td>
                  <td>{item.image_count}</td>
                  <td>{item.video_count}</td>
                  <td>{item.warning_count}</td>
                  <td className="text-sm text-[var(--dv8-muted)]">
                    {item.import_scope === "historical"
                      ? "Historical"
                      : item.import_scope === "recent"
                        ? "Recent"
                        : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
