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

  const busy = loading || checking || discovering;

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
