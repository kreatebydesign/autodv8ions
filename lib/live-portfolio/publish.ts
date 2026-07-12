import { getSupabaseAdmin } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils/format";

export type PublishEditorialFields = {
  vehicle?: string;
  workDate?: string | null;
  shadePercentage?: string | null;
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  slug?: string;
  featuredMediaId?: string | null;
};

export type PublishAction = "publish" | "unpublish" | "save";

function isReadyForPublish(media: {
  media_type: string;
  processing_status: string | null;
  blob_key: string | null;
  storage_pathname: string | null;
}[]) {
  if (media.length === 0) return false;
  const pending = media.some(
    (m) =>
      m.processing_status === "pending_download" ||
      m.processing_status === "downloaded" ||
      m.processing_status === "processed",
  );
  const failed = media.some((m) => m.processing_status === "failed");
  const readyImages = media.filter(
    (m) =>
      m.media_type === "image" &&
      m.processing_status === "ready_for_review" &&
      Boolean(m.blob_key || m.storage_pathname),
  );
  return !pending && !failed && readyImages.length > 0;
}

async function applyFeaturedMedia(
  galleryItemId: string,
  featuredMediaId: string | null | undefined,
) {
  const supabase = getSupabaseAdmin();
  if (!supabase || !featuredMediaId) return;

  const { data: owned } = await supabase
    .from("gallery_media")
    .select("id")
    .eq("gallery_item_id", galleryItemId)
    .eq("id", featuredMediaId)
    .maybeSingle();

  if (!owned) return;

  await supabase
    .from("gallery_media")
    .update({ is_featured: false })
    .eq("gallery_item_id", galleryItemId);

  await supabase
    .from("gallery_media")
    .update({ is_featured: true })
    .eq("id", featuredMediaId);
}

async function resolveUniqueSlug(
  desired: string,
  excludeId: string,
): Promise<string | { error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "Database unavailable." };

  const base = slugify(desired) || `tint-work-${excludeId.slice(0, 8)}`;
  let candidate = base;
  let attempt = 0;

  while (attempt < 20) {
    const { data } = await supabase
      .from("gallery_items")
      .select("id")
      .eq("slug", candidate)
      .neq("id", excludeId)
      .maybeSingle();

    if (!data) return candidate;
    attempt += 1;
    candidate = `${base}-${attempt + 1}`;
  }

  return { error: "Unable to allocate a unique slug." };
}

export async function updateGalleryPublishState(options: {
  id: string;
  action: PublishAction;
  fields?: PublishEditorialFields;
  approvedBy?: string | null;
}): Promise<{ ok: true; published: boolean } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Database unavailable." };

  const { data: item, error: itemError } = await supabase
    .from("gallery_items")
    .select(
      "id, slug, vehicle, work_date, published, status, shade_percentage, seo_title, seo_description, description",
    )
    .eq("id", options.id)
    .maybeSingle();

  if (itemError || !item) {
    return { ok: false, error: "Gallery item not found." };
  }

  const { data: media } = await supabase
    .from("gallery_media")
    .select(
      "id, media_type, processing_status, blob_key, storage_pathname, is_featured",
    )
    .eq("gallery_item_id", options.id);

  const rows = media || [];
  const fields = options.fields || {};

  if (options.action === "publish" && !isReadyForPublish(rows)) {
    return {
      ok: false,
      error:
        "Item is not ready for publish. Finish Media Processing with no failed or pending files.",
    };
  }

  const nextVehicle = (fields.vehicle ?? item.vehicle ?? "").trim();
  if (!nextVehicle) {
    return { ok: false, error: "Vehicle name is required." };
  }

  const slugResult = await resolveUniqueSlug(
    fields.slug?.trim() || item.slug || nextVehicle,
    options.id,
  );
  if (typeof slugResult !== "string") {
    return { ok: false, error: slugResult.error };
  }

  const existingDescription =
    "description" in item
      ? ((item as { description?: string | null }).description ?? null)
      : null;

  const patch: Record<string, unknown> = {
    vehicle: nextVehicle,
    work_date:
      fields.workDate === undefined ? item.work_date : fields.workDate || null,
    shade_percentage:
      fields.shadePercentage === undefined
        ? item.shade_percentage
        : fields.shadePercentage || null,
    description:
      fields.description === undefined
        ? existingDescription
        : fields.description || null,
    seo_title:
      fields.seoTitle === undefined ? item.seo_title : fields.seoTitle || null,
    seo_description:
      fields.seoDescription === undefined
        ? item.seo_description
        : fields.seoDescription || null,
    slug: slugResult,
  };

  if (options.action === "publish") {
    patch.published = true;
    patch.status = "approved";
    patch.provisional_vehicle = false;
    patch.approved_at = new Date().toISOString();
    if (options.approvedBy) patch.approved_by = options.approvedBy;
  } else if (options.action === "unpublish") {
    patch.published = false;
    patch.status = "pending";
    patch.approved_at = null;
    patch.approved_by = null;
  }

  const { error: updateError } = await supabase
    .from("gallery_items")
    .update(patch)
    .eq("id", options.id);

  if (updateError) {
    console.error("[publish]", updateError.message);
    return { ok: false, error: updateError.message };
  }

  await applyFeaturedMedia(options.id, fields.featuredMediaId);

  return {
    ok: true,
    published: options.action === "publish" ? true : options.action === "unpublish" ? false : Boolean(item.published),
  };
}
