"use client";

import { useState } from "react";
import type { ContentUpload } from "@/lib/types/database";
import { formatDate } from "@/lib/utils/format";

export default function ContentClient({
  initialUploads,
  connected,
  message,
}: {
  initialUploads: ContentUpload[];
  connected: boolean;
  message: string | null;
}) {
  const [uploads, setUploads] = useState(initialUploads);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function syncDrive() {
    setLoading(true);
    setStatus("");
    const res = await fetch("/api/content", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setStatus(data.error || "Sync failed.");
      return;
    }
    setStatus(`Synced ${data.count || 0} folders from Google Drive.`);
    const refresh = await fetch("/api/content");
    const refreshed = await refresh.json();
    setUploads(refreshed.uploads || []);
  }

  async function copyCaption(text: string | null) {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setStatus("Caption copied.");
  }

  return (
    <div className="space-y-6">
      {!connected && (
        <div className="admin-panel px-4 py-3 text-sm text-[var(--dv8-muted)]">
          {message || "Google Drive is not connected yet."}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="button" className="admin-btn admin-btn-primary" disabled={loading || !connected} onClick={syncDrive}>
          {loading ? "Syncing..." : "Sync Google Drive"}
        </button>
      </div>

      {status && <div className="admin-panel px-4 py-3 text-sm text-[var(--dv8-muted)]">{status}</div>}

      <div className="admin-panel overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Service</th>
              <th>Photos</th>
              <th>Videos</th>
              <th>Upload Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {uploads.map((item) => (
              <tr key={item.id}>
                <td>{item.vehicle_name}</td>
                <td>{item.service_type}</td>
                <td>{item.photos_count}</td>
                <td>{item.videos_count}</td>
                <td>{formatDate(item.upload_date)}</td>
                <td>
                  <div className="flex flex-wrap gap-2">
                    {item.drive_folder_url && (
                      <a href={item.drive_folder_url} target="_blank" rel="noopener noreferrer" className="admin-btn">
                        Open Drive
                      </a>
                    )}
                    <button type="button" className="admin-btn" onClick={() => copyCaption(item.caption_reel)}>
                      Reel Caption
                    </button>
                    <button type="button" className="admin-btn" onClick={() => copyCaption(item.caption_facebook)}>
                      Facebook Caption
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
