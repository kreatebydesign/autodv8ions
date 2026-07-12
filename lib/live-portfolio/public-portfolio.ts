import { getPortfolioEngineLimits } from "@/lib/portfolio-engine/settings";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { resolveMediaPathname } from "@/lib/live-portfolio/review-data";

export type PublicPortfolioCard = {
  id: string;
  slug: string;
  vehicle: string;
  workDate: string | null;
  shadePercentage: string | null;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  coverMediaId: string | null;
  imageCount: number;
  videoCount: number;
  pinned: boolean;
};

export type PublicPortfolioDetail = PublicPortfolioCard & {
  serviceType: string;
  media: {
    id: string;
    mediaType: "image" | "video";
    filename: string;
    isFeatured: boolean;
    sortOrder: number;
    hasBlob: boolean;
  }[];
};

export { publicMediaUrl } from "@/lib/live-portfolio/public-media-url";

type MediaRow = {
  id: string;
  gallery_item_id: string;
  media_type: string;
  is_featured: boolean | null;
  processing_status: string | null;
  blob_key: string | null;
  storage_pathname: string | null;
  sort_order: number | null;
  variants?: unknown;
  blob_purged_at?: string | null;
  drive_file_name?: string | null;
};

function mediaHasBlob(m: MediaRow) {
  return (
    !m.blob_purged_at &&
    Boolean(
      resolveMediaPathname(m, "medium") || m.blob_key || m.storage_pathname,
    )
  );
}

function coverFromMedia(rows: MediaRow[]) {
  const images = rows.filter((m) => m.media_type === "image");
  return (
    images.find((m) => m.is_featured && mediaHasBlob(m)) ||
    images.find(
      (m) => m.processing_status === "ready_for_review" && mediaHasBlob(m),
    ) ||
    images.find((m) => mediaHasBlob(m)) ||
    null
  );
}

function toCard(
  item: {
    id: string;
    slug: string;
    vehicle: string;
    work_date: string | null;
    shade_percentage: string | null;
    description?: string | null;
    seo_title: string | null;
    seo_description: string | null;
    pinned?: boolean | null;
  },
  media: MediaRow[],
): PublicPortfolioCard {
  const images = media.filter((m) => m.media_type === "image");
  const videos = media.filter((m) => m.media_type === "video");
  const featured = coverFromMedia(media);

  return {
    id: item.id,
    slug: item.slug,
    vehicle: item.vehicle,
    workDate: item.work_date,
    shadePercentage: item.shade_percentage,
    description: item.description ?? null,
    seoTitle: item.seo_title,
    seoDescription: item.seo_description,
    coverMediaId: featured?.id ?? null,
    imageCount: images.length,
    videoCount: videos.length,
    pinned: Boolean(item.pinned),
  };
}

async function loadMediaByItemIds(
  itemIds: string[],
): Promise<Map<string, MediaRow[]>> {
  const map = new Map<string, MediaRow[]>();
  if (itemIds.length === 0) return map;

  const supabase = getSupabaseAdmin();
  if (!supabase) return map;

  const { data: media } = await supabase
    .from("gallery_media")
    .select(
      "id, gallery_item_id, media_type, is_featured, processing_status, blob_key, storage_pathname, sort_order, variants, blob_purged_at, drive_file_name",
    )
    .in("gallery_item_id", itemIds)
    .order("sort_order", { ascending: true });

  for (const row of (media || []) as MediaRow[]) {
    const list = map.get(row.gallery_item_id) || [];
    list.push(row);
    map.set(row.gallery_item_id, list);
  }

  return map;
}

/**
 * Live Showcase listing:
 * - Pinned projects always included (up to pinnedLimit)
 * - Remaining slots filled by newest published (published_at / work_date)
 * - Never exceeds liveShowcaseLimit (or explicit limit, whichever is smaller)
 */
export async function listPublishedPortfolio(
  limit?: number,
): Promise<PublicPortfolioCard[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const limits = await getPortfolioEngineLimits();
  const cap = Math.min(
    limit ?? limits.liveShowcaseLimit,
    limits.liveShowcaseLimit,
  );

  const { data: items, error } = await supabase
    .from("gallery_items")
    .select(
      "id, slug, vehicle, work_date, shade_percentage, description, seo_title, seo_description, service_type, pinned, published_at",
    )
    .eq("published", true)
    .eq("service_type", "Window Tint")
    .order("pinned", { ascending: false })
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("work_date", { ascending: false, nullsFirst: false })
    .limit(Math.max(cap * 3, 24));

  if (error || !items) {
    console.error("[public-portfolio] list:", error?.message);
    return [];
  }

  const pinned = items
    .filter((item) => item.pinned)
    .slice(0, limits.pinnedLimit);
  const pinnedIds = new Set(pinned.map((p) => p.id));
  const rotating = items
    .filter((item) => !pinnedIds.has(item.id))
    .slice(0, Math.max(0, cap - pinned.length));

  const selected = [...pinned, ...rotating].slice(0, cap);
  const mediaByItem = await loadMediaByItemIds(selected.map((item) => item.id));

  return selected.map((item) => toCard(item, mediaByItem.get(item.id) || []));
}

export async function listHomepagePortfolio(): Promise<PublicPortfolioCard[]> {
  const limits = await getPortfolioEngineLimits();
  return listPublishedPortfolio(limits.homepageLimit);
}

export async function getPublishedPortfolioBySlug(
  slug: string,
): Promise<PublicPortfolioDetail | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data: item, error } = await supabase
    .from("gallery_items")
    .select(
      "id, slug, vehicle, work_date, shade_percentage, description, seo_title, seo_description, service_type, pinned",
    )
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (error || !item) return null;

  const mediaByItem = await loadMediaByItemIds([item.id]);
  const rows = mediaByItem.get(item.id) || [];
  const card = toCard(item, rows);

  return {
    ...card,
    serviceType: item.service_type,
    media: rows.map((m) => ({
      id: m.id,
      mediaType: m.media_type as "image" | "video",
      filename: m.drive_file_name || "file",
      isFeatured: Boolean(m.is_featured),
      sortOrder: m.sort_order ?? 0,
      hasBlob: mediaHasBlob(m),
    })),
  };
}

export async function listRelatedPublished(
  excludeId: string,
  limit = 3,
): Promise<PublicPortfolioCard[]> {
  const all = await listPublishedPortfolio();
  return all.filter((item) => item.id !== excludeId).slice(0, limit);
}
