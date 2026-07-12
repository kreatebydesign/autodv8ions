import { archiveGalleryItem } from "@/lib/portfolio-engine/archive";
import { getPortfolioEngineLimits } from "@/lib/portfolio-engine/settings";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Rotation algorithm (Live Showcase):
 * 1. Count currently published (live) items.
 * 2. If count < liveShowcaseLimit → publish without displacement.
 * 3. If count >= liveShowcaseLimit → archive oldest non-pinned published
 *    items until there is room for the new publish (usually 1 slot).
 * 4. Pinned projects are never auto-archived.
 */
export async function makeRoomInLiveShowcase(options?: {
  slotsNeeded?: number;
}): Promise<
  | { ok: true; archivedIds: string[] }
  | { ok: false; error: string }
> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Database unavailable." };

  const limits = await getPortfolioEngineLimits();
  const slotsNeeded = Math.max(1, options?.slotsNeeded ?? 1);

  const { data: live, error } = await supabase
    .from("gallery_items")
    .select("id, pinned, published_at, work_date, created_at, status")
    .eq("published", true)
    .order("published_at", { ascending: true, nullsFirst: true });

  if (error || !live) {
    return { ok: false, error: error?.message || "Unable to load showcase." };
  }

  // Prefer new lifecycle status; still count legacy approved+published rows.
  const rows = live.filter(
    (row) =>
      row.status === "published" ||
      row.status === "approved" ||
      row.status == null,
  );
  const freeSlots = Math.max(0, limits.liveShowcaseLimit - rows.length);
  let toArchive = Math.max(0, slotsNeeded - freeSlots);

  if (toArchive === 0) {
    return { ok: true, archivedIds: [] };
  }

  const rotatable = rows.filter((row) => !row.pinned);
  const archivedIds: string[] = [];

  for (const row of rotatable) {
    if (toArchive <= 0) break;
    const result = await archiveGalleryItem({
      id: row.id,
      mode: "showcase",
    });
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    archivedIds.push(row.id);
    toArchive -= 1;
  }

  if (toArchive > 0) {
    return {
      ok: false,
      error:
        "Live Showcase is full of pinned projects. Unpin one before publishing more.",
    };
  }

  return { ok: true, archivedIds };
}

/**
 * Smart Review Queue trim:
 * If pending_review + draft exceed reviewQueueLimit,
 * oldest overflow becomes archived_review (metadata kept).
 */
export async function trimReviewQueue(): Promise<
  | { ok: true; archivedIds: string[]; queueSize: number }
  | { ok: false; error: string }
> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Database unavailable." };

  const limits = await getPortfolioEngineLimits();

  const { data, error } = await supabase
    .from("gallery_items")
    .select("id, status, work_date, created_at, updated_at")
    .in("status", ["pending_review", "draft", "pending"])
    .eq("published", false)
    .order("work_date", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true });

  if (error) {
    return { ok: false, error: error.message };
  }

  const queue = data || [];
  const overflow = queue.length - limits.reviewQueueLimit;
  if (overflow <= 0) {
    return { ok: true, archivedIds: [], queueSize: queue.length };
  }

  const victims = queue.slice(0, overflow);
  const archivedIds: string[] = [];

  for (const row of victims) {
    const result = await archiveGalleryItem({
      id: row.id,
      mode: "review_queue",
    });
    if (result.ok) archivedIds.push(row.id);
  }

  return {
    ok: true,
    archivedIds,
    queueSize: queue.length - archivedIds.length,
  };
}
