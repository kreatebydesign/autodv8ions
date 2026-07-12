import MediaProcessingClient from "@/components/admin/MediaProcessingClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminMediaProcessingPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--dv8-muted)]">
          Media
        </p>
        <h1 className="mt-2 text-3xl font-light tracking-tight">
          Media Processing
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--dv8-muted)]">
          Private ingestion via the KXD Asset Engine. Files stay unpublished and
          are never exposed with public URLs in this phase.
        </p>
      </div>
      <MediaProcessingClient />
    </div>
  );
}
