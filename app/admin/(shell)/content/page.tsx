import ContentClient from "@/components/admin/ContentClient";
import { isGoogleDriveConfigured, listContentUploadsFromDb } from "@/lib/google/drive";

export default async function AdminContentPage() {
  const uploads = await listContentUploadsFromDb();
  const connected = isGoogleDriveConfigured();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--dv8-muted)]">
          Content
        </p>
        <h1 className="mt-2 text-3xl font-light tracking-tight">Content</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--dv8-muted)]">
          Daily uploads from Google Drive appear here automatically after sync.
          Use generated captions to speed up social posting.
        </p>
      </div>
      <ContentClient
        initialUploads={uploads}
        connected={connected}
        message={connected ? null : "Google Drive is not connected yet."}
      />
    </div>
  );
}
