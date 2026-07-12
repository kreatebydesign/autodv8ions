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

export async function listPublishedPortfolio(
  limit = 48,
): Promise<PublicPortfolioCard[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data: items, error } = await supabase
    .from("gallery_items")
    .select(
      "id, slug, vehicle, work_date, shade_percentage, description, seo_title, seo_description, service_type",
    )
    .eq("published", true)
    .eq("service_type", "Window Tint")
    .order("work_date", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error || !items) {
    console.error("[public-portfolio] list:", error?.message);
    return [];
  }

  const cards = await Promise.all(
    items.map(async (item) => {
      const { data: media } = await supabase
        .from("gallery_media")
        .select(
          "id, media_type, is_featured, processing_status, blob_key, storage_pathname, sort_order, variants",
        )
        .eq("gallery_item_id", item.id)
        .order("sort_order", { ascending: true });

      const rows = media || [];
      const images = rows.filter((m) => m.media_type === "image");
      const videos = rows.filter((m) => m.media_type === "video");
      const withBlob = (m: {
        blob_key: string | null;
        storage_pathname: string | null;
        variants?: unknown;
      }) =>
        Boolean(
          resolveMediaPathname(m, "medium") ||
            m.blob_key ||
            m.storage_pathname,
        );

      const featured =
        images.find((m) => m.is_featured && withBlob(m)) ||
        images.find(
          (m) => m.processing_status === "ready_for_review" && withBlob(m),
        ) ||
        images.find((m) => withBlob(m)) ||
        null;

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
      } satisfies PublicPortfolioCard;
    }),
  );

  return cards;
}

export async function getPublishedPortfolioBySlug(
  slug: string,
): Promise<PublicPortfolioDetail | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data: item, error } = await supabase
    .from("gallery_items")
    .select(
      "id, slug, vehicle, work_date, shade_percentage, description, seo_title, seo_description, service_type",
    )
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (error || !item) return null;

  const { data: media } = await supabase
    .from("gallery_media")
    .select(
      "id, drive_file_name, media_type, is_featured, processing_status, blob_key, storage_pathname, sort_order, variants",
    )
    .eq("gallery_item_id", item.id)
    .order("sort_order", { ascending: true });

  const rows = media || [];
  const images = rows.filter((m) => m.media_type === "image");
  const videos = rows.filter((m) => m.media_type === "video");
  const withBlob = (m: {
    blob_key: string | null;
    storage_pathname: string | null;
    variants?: unknown;
  }) =>
    Boolean(
      resolveMediaPathname(m, "medium") || m.blob_key || m.storage_pathname,
    );

  const featured =
    images.find((m) => m.is_featured && withBlob(m)) ||
    images.find(
      (m) => m.processing_status === "ready_for_review" && withBlob(m),
    ) ||
    images.find((m) => withBlob(m)) ||
    null;

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
    serviceType: item.service_type,
    media: rows.map((m) => ({
      id: m.id,
      mediaType: m.media_type as "image" | "video",
      filename: m.drive_file_name || "file",
      isFeatured: Boolean(m.is_featured),
      sortOrder: m.sort_order ?? 0,
      hasBlob: withBlob(m),
    })),
  };
}

export async function listRelatedPublished(
  excludeId: string,
  limit = 3,
): Promise<PublicPortfolioCard[]> {
  const all = await listPublishedPortfolio(limit + 8);
  return all.filter((item) => item.id !== excludeId).slice(0, limit);
}
