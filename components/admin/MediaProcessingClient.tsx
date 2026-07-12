"use client";

import { useCallback, useEffect, useState } from "react";

type QueueItem = {
  id: string;
  galleryItemId: string;
  filename: string;
  mimeType: string;
  mediaType: string;
  processingStatus: string;
  processingError: string | null;
  processingAttempts: number;
  bytes: number | null;
  blobKey: string | null;
  width: number | null;
  height: number | null;
};

type QueueCounts = {
  queued: number;
  pending_download: number;
  downloaded: number;
  processed: number;
  ready_for_review: number;
  failed: number;
};

export default function MediaProcessingClient() {
  const [counts, setCounts] = useState<QueueCounts | null>(null);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/content/media-process", {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus(
          `Failed to load media queue: ${data.error?.message || "unknown error"}`,
        );
        return;
      }
      setCounts(data.counts);
      setItems(Array.isArray(data.items) ? data.items : []);
      setStatus("");
    } catch {
      setStatus("Failed to load media queue: network error.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function runProcess(options: {
    retryFailed?: boolean;
    mediaIds?: string[];
  }) {
    const confirmed = window.confirm(
      [
        "Media Workspace",
        "",
        "This will download media from Google Drive into private Blob storage.",
        "• Nothing will publish",
        "• No public URLs will be created",
        "• Drive originals will not be deleted",
        "• Batch is limited (default 5 files)",
        "",
        "Continue?",
      ].join("\n"),
    );
    if (!confirmed) {
      setStatus("Media processing cancelled.");
      return;
    }

    setProcessing(true);
    setStatus("");
    try {
      const res = await fetch("/api/content/media-process", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmMediaProcess: true,
          maxItems: 5,
          retryFailed: options.retryFailed === true,
          mediaIds: options.mediaIds,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus(
          `Media processing failed: ${data.error?.message || "unknown error"}`,
        );
        return;
      }

      setStatus(
        `Processed ${data.summary?.processed ?? 0} · skipped ${data.summary?.skipped ?? 0} · failed ${data.summary?.failed ?? 0} · claimed ${data.summary?.claimed ?? 0}. published=false · publicUrlsCreated=false.`,
      );
      await refresh();
    } catch {
      setStatus("Media processing failed: network error.");
    } finally {
      setProcessing(false);
    }
  }

  const busy = loading || processing;

  return (
    <div className="space-y-6">
      <div className="admin-panel space-y-3 px-4 py-4">
        <div className="text-sm font-medium text-[var(--dv8-ink)]">
          Media Workspace
        </div>
        <p className="text-sm text-[var(--dv8-muted)]">
          Downloads pending gallery media into private managed storage via the
          KXD Asset Engine. Generates image variants. Does not publish or expose
          public URLs.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="admin-btn"
            disabled={busy}
            onClick={() => void refresh()}
          >
            {loading ? "Refreshing..." : "Refresh Queue"}
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            disabled={busy}
            onClick={() => void runProcess({})}
          >
            {processing ? "Processing..." : "Process Next Batch"}
          </button>
          <button
            type="button"
            className="admin-btn"
            disabled={busy || !counts?.failed}
            onClick={() => void runProcess({ retryFailed: true })}
          >
            Retry Failed
          </button>
        </div>
        {counts && (
          <div className="grid gap-2 text-sm text-[var(--dv8-muted)] sm:grid-cols-3 lg:grid-cols-6">
            <div>Queued: {counts.queued}</div>
            <div>Pending download: {counts.pending_download}</div>
            <div>Downloaded: {counts.downloaded}</div>
            <div>Processed: {counts.processed}</div>
            <div>Ready for review: {counts.ready_for_review}</div>
            <div>Failed: {counts.failed}</div>
          </div>
        )}
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
              <th>File</th>
              <th>Type</th>
              <th>Bytes</th>
              <th>Size</th>
              <th>Attempts</th>
              <th>Blob</th>
              <th>Error</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-[var(--dv8-muted)]">
                  No media inventory rows yet. Run pending import first.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className="uppercase tracking-[0.12em] text-xs">
                      {item.processingStatus}
                    </span>
                  </td>
                  <td className="text-sm">{item.filename || "—"}</td>
                  <td className="text-sm text-[var(--dv8-muted)]">
                    {item.mediaType}
                  </td>
                  <td className="text-sm text-[var(--dv8-muted)]">
                    {item.bytes != null ? item.bytes.toLocaleString() : "—"}
                  </td>
                  <td className="text-sm text-[var(--dv8-muted)]">
                    {item.width && item.height
                      ? `${item.width}×${item.height}`
                      : "—"}
                  </td>
                  <td>{item.processingAttempts}</td>
                  <td className="text-sm text-[var(--dv8-muted)]">
                    {item.blobKey ? "private" : "—"}
                  </td>
                  <td className="max-w-[220px] truncate text-sm text-[var(--dv8-muted)]">
                    {item.processingError || "—"}
                  </td>
                  <td>
                    {(item.processingStatus === "failed" ||
                      item.processingStatus === "pending_download") && (
                      <button
                        type="button"
                        className="admin-btn"
                        disabled={busy}
                        onClick={() =>
                          void runProcess({ mediaIds: [item.id] })
                        }
                      >
                        Retry
                      </button>
                    )}
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
