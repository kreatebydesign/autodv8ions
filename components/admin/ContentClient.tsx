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

  async function syncDrive(mode?: string) {
    setLoading(true);
    setStatus("");
    const res = await fetch("/api/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        mode
          ? { mode }
          : {},
      ),
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
          className="admin-btn admin-btn-primary"
          disabled={loading || !connected}
          onClick={() => syncDrive()}
        >
          {loading ? "Syncing..." : "Sync Recent Tint Jobs"}
        </button>
        <button
          type="button"
          className="admin-btn"
          disabled={loading || !connected}
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
