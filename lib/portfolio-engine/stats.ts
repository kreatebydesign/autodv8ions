import { countCleanupEligible } from "@/lib/portfolio-engine/cleanup";
import {
  getPortfolioEngineLimits,
} from "@/lib/portfolio-engine/settings";
import type { PortfolioEngineLimits } from "@/lib/portfolio-engine/config";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export type PortfolioEngineStats = {
  limits: PortfolioEngineLimits;
  reviewQueueCount: number;
  publishedCount: number;
  pinnedCount: number;
  archivedCount: number;
  cleanupEligibleCount: number;
  blobBytesEstimate: number;
};

export async function getPortfolioEngineStats(): Promise<PortfolioEngineStats> {
  const supabase = getSupabaseAdmin();
  const limits = await getPortfolioEngineLimits();

  if (!supabase) {
    return {
      limits,
      reviewQueueCount: 0,
      publishedCount: 0,
      pinnedCount: 0,
      archivedCount: 0,
      cleanupEligibleCount: 0,
      blobBytesEstimate: 0,
    };
  }

  const [
    reviewQueue,
    published,
    pinned,
    archived,
    cleanupEligibleCount,
    mediaBytes,
  ] = await Promise.all([
    supabase
      .from("gallery_items")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending_review", "draft", "pending"])
      .eq("published", false),
    supabase
      .from("gallery_items")
      .select("id", { count: "exact", head: true })
      .eq("published", true),
    supabase
      .from("gallery_items")
      .select("id", { count: "exact", head: true })
      .eq("pinned", true)
      .eq("published", true),
    supabase
      .from("gallery_items")
      .select("id", { count: "exact", head: true })
      .in("status", ["archived", "archived_review"]),
    countCleanupEligible(),
    supabase
      .from("gallery_media")
      .select("bytes")
      .is("blob_purged_at", null)
      .not("blob_key", "is", null)
      .limit(2000),
  ]);

  const blobBytesEstimate = (mediaBytes.data || []).reduce(
    (sum, row) => sum + (typeof row.bytes === "number" ? row.bytes : 0),
    0,
  );

  return {
    limits,
    reviewQueueCount: reviewQueue.count ?? 0,
    publishedCount: published.count ?? 0,
    pinnedCount: pinned.count ?? 0,
    archivedCount: archived.count ?? 0,
    cleanupEligibleCount,
    blobBytesEstimate,
  };
}

export async function setGalleryItemPinned(
  id: string,
  pinned: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Database unavailable." };

  const limits = await getPortfolioEngineLimits();

  if (pinned) {
    const { data: item } = await supabase
      .from("gallery_items")
      .select("id, published")
      .eq("id", id)
      .maybeSingle();

    if (!item?.published) {
      return {
        ok: false,
        error: "Only published projects can be pinned.",
      };
    }

    const { count } = await supabase
      .from("gallery_items")
      .select("id", { count: "exact", head: true })
      .eq("pinned", true)
      .eq("published", true)
      .neq("id", id);

    if ((count ?? 0) >= limits.pinnedLimit) {
      return {
        ok: false,
        error: `Pinned limit reached (${limits.pinnedLimit}). Unpin another project first.`,
      };
    }
  }

  const { error } = await supabase
    .from("gallery_items")
    .update({ pinned })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
