/**
 * Drive sync must never demote curated/live gallery lifecycle as a side effect.
 * Pending import creates new rows; legacy sync upserts — these helpers keep that safe.
 */

export type ExistingGallerySyncRow = {
  status?: string | null;
  published?: boolean | null;
  provisional_vehicle?: boolean | null;
  vehicle?: string | null;
  work_date?: string | null;
  slug?: string | null;
  shade_percentage?: unknown;
  photos?: unknown;
  videos?: unknown;
  seo_title?: string | null;
  seo_description?: string | null;
  description?: string | null;
  approved_at?: unknown;
  approved_by?: unknown;
  import_scope?: string | null;
  validation_errors?: unknown;
  pinned?: boolean | null;
};

/** Modern + legacy statuses that represent curated or queued editorial work. */
export const SYNC_PROTECTED_STATUSES = new Set([
  "published",
  "approved",
  "pending_review",
  "draft",
  "rejected",
  "archived",
  "archived_review",
  "failed",
  "pending",
]);

/**
 * Any existing gallery row keeps its status + published flag on Drive sync.
 * Sync is not a publish/unpublish tool.
 */
export function shouldPreserveLifecycle(
  existing: ExistingGallerySyncRow | null | undefined,
): boolean {
  return Boolean(existing);
}

/**
 * Human-edited / live / archived rows keep title-ish metadata and media URL arrays.
 * Provisional pending_review rows may still refresh vehicle/work_date from Drive.
 */
export function shouldPreserveHumanEditedMetadata(
  existing: ExistingGallerySyncRow | null | undefined,
): boolean {
  if (!existing) return false;
  if (existing.published === true) return true;
  if (existing.provisional_vehicle === false) return true;
  const status = String(existing.status || "");
  return (
    status === "published" ||
    status === "approved" ||
    status === "draft" ||
    status === "rejected" ||
    status === "archived" ||
    status === "archived_review" ||
    status === "failed"
  );
}

/**
 * Pending import must not attach newly discovered Drive media to curated/live parents.
 * Purely provisional pending_review / legacy pending rows may still receive new media.
 */
export function shouldWithholdNewMediaForParent(
  existing: ExistingGallerySyncRow | null | undefined,
): boolean {
  return shouldPreserveHumanEditedMetadata(existing);
}

export const NEW_MEDIA_WITHHELD_CURATED_PARENT_REASON =
  "new_media_withheld_curated_parent";

export const NEW_MEDIA_WITHHELD_CURATED_PARENT_DETAIL =
  "new media withheld — published/curated parent";

export function resolveSyncLifecycleFields(
  existing: ExistingGallerySyncRow | null | undefined,
): { status: string; published: boolean } {
  if (shouldPreserveLifecycle(existing) && existing) {
    return {
      status: String(existing.status || "pending_review"),
      published: Boolean(existing.published),
    };
  }
  return { status: "pending_review", published: false };
}

export function resolveSyncVehicleAndWorkDate(
  existing: ExistingGallerySyncRow | null | undefined,
  incoming: { vehicle: string; workDate: string | null },
): { vehicle: string; workDate: string | null } {
  if (shouldPreserveHumanEditedMetadata(existing) && existing) {
    return {
      vehicle: String(existing.vehicle || incoming.vehicle),
      workDate:
        existing.work_date != null ? String(existing.work_date) : incoming.workDate,
    };
  }
  return { vehicle: incoming.vehicle, workDate: incoming.workDate };
}
