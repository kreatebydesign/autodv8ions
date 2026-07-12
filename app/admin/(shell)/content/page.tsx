import ContentClient from "@/components/admin/ContentClient";
import {
  isGoogleDriveConfigured,
  listPortfolioItemsFromDb,
} from "@/lib/google/drive";
import type { PortfolioListItem } from "@/lib/types/database";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminContentPage() {
  const items = (await listPortfolioItemsFromDb()) as PortfolioListItem[];
  const connected = isGoogleDriveConfigured();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--dv8-muted)]">
          Content
        </p>
        <h1 className="mt-2 text-3xl font-light tracking-tight">Content</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--dv8-muted)]">
          Sync pulls Tint Jobs from Google Drive for review only. Nothing is
          published to the website until a later approval step. Vehicle names
          and dates from folder names are provisional.
        </p>
      </div>
      <ContentClient
        initialItems={items}
        connected={connected}
        message={
          connected
            ? "Sync imports content for review and does not publish it."
            : "Google Drive is not connected yet."
        }
      />
    </div>
  );
}
