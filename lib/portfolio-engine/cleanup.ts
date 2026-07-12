import { VercelBlobStorageProvider } from "@/lib/asset-engine/storage/vercel-blob";
import { getPortfolioEngineLimits } from "@/lib/portfolio-engine/settings";
import { resolveMediaPathname } from "@/lib/live-portfolio/review-data";
import { getSupabaseAdmin } from "@/lib/supabase/server";

function collectBlobPathnames(media: {
  blob_key?: string | null;
  storage_pathname?: string | null;
  variants?: unknown;
}): string[] {
  const paths = new Set<string>();
  const add = (value?: string | null) => {
    if (value && value.trim()) paths.add(value.trim());
  };

  add(media.blob_key);
  add(media.storage_pathname);

  for (const variant of [
    "thumbnail",
    "small",
    "medium",
    "large",
    "original",
  ] as const) {
    add(resolveMediaPathname(media, variant));
  }

  if (media.variants && typeof media.variants === "object") {
    for (const entry of Object.values(
      media.variants as Record<string, { pathname?: string; key?: string }>,
    )) {
      if (entry && typeof entry === "object") {
        add(entry.pathname);
        add(entry.key);
      }
    }
  }

  return [...paths];
}

/**
 * Blob cleanup strategy:
 * - Eligible: gallery_items with status archived|archived_review
 *   and archived_at older than retentionDays
 * - Delete private Blob originals + variants only
 * - Keep gallery_items / gallery_media rows, Drive IDs, editorial fields
 * - Mark media processing_status for future re-download
 */
export async function cleanupExpiredArchivedBlobs(options?: {
  dryRun?: boolean;
  limit?: number;
}): Promise<{
  ok: true;
  dryRun: boolean;
  eligibleItems: number;
  mediaTouched: number;
  pathnamesDeleted: number;
  errors: string[];
}> {
  const supabase = getSupabaseAdmin();
  const dryRun = options?.dryRun === true;
  const limit = options?.limit ?? 40;
  const errors: string[] = [];

  if (!supabase) {
    return {
      ok: true,
      dryRun,
      eligibleItems: 0,
      mediaTouched: 0,
      pathnamesDeleted: 0,
      errors: ["Database unavailable."],
    };
  }

  const limits = await getPortfolioEngineLimits();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - limits.retentionDays);
  const cutoffIso = cutoff.toISOString();

  const { data: items, error } = await supabase
    .from("gallery_items")
    .select("id, archived_at, blob_purged_at")
    .in("status", ["archived", "archived_review"])
    .is("blob_purged_at", null)
    .lt("archived_at", cutoffIso)
    .order("archived_at", { ascending: true })
    .limit(limit);

  if (error) {
    return {
      ok: true,
      dryRun,
      eligibleItems: 0,
      mediaTouched: 0,
      pathnamesDeleted: 0,
      errors: [error.message],
    };
  }

  const eligible = items || [];
  let mediaTouched = 0;
  let pathnamesDeleted = 0;
  const storage = dryRun ? null : new VercelBlobStorageProvider();

  for (const item of eligible) {
    const { data: media } = await supabase
      .from("gallery_media")
      .select(
        "id, blob_key, storage_pathname, variants, blob_purged_at, drive_file_id",
      )
      .eq("gallery_item_id", item.id);

    const rows = media || [];
    const now = new Date().toISOString();

    for (const row of rows) {
      if (row.blob_purged_at) continue;
      const pathnames = collectBlobPathnames(row);
      if (pathnames.length === 0) {
        if (!dryRun) {
          await supabase
            .from("gallery_media")
            .update({
              blob_purged_at: now,
              processing_status: "pending_download",
            })
            .eq("id", row.id);
        }
        mediaTouched += 1;
        continue;
      }

      if (!dryRun && storage) {
        for (const pathname of pathnames) {
          try {
            await storage.delete(pathname);
            pathnamesDeleted += 1;
          } catch (err) {
            errors.push(
              `${row.id}:${pathname}: ${
                err instanceof Error ? err.message : "delete failed"
              }`,
            );
          }
        }

        await supabase
          .from("gallery_media")
          .update({
            blob_key: null,
            storage_pathname: null,
            storage_url: null,
            variants: {},
            blob_purged_at: now,
            processing_status: "pending_download",
            processing_error: null,
          })
          .eq("id", row.id);
      } else {
        pathnamesDeleted += pathnames.length;
      }

      mediaTouched += 1;
    }

    if (!dryRun) {
      await supabase
        .from("gallery_items")
        .update({ blob_purged_at: now })
        .eq("id", item.id);
    }
  }

  return {
    ok: true,
    dryRun,
    eligibleItems: eligible.length,
    mediaTouched,
    pathnamesDeleted,
    errors,
  };
}

export async function countCleanupEligible(): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 0;
  const limits = await getPortfolioEngineLimits();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - limits.retentionDays);

  const { count } = await supabase
    .from("gallery_items")
    .select("id", { count: "exact", head: true })
    .in("status", ["archived", "archived_review"])
    .is("blob_purged_at", null)
    .lt("archived_at", cutoff.toISOString());

  return count ?? 0;
}
