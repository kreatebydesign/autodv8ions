import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { GalleryItemStatus } from "@/lib/live-portfolio/types";

export type ReviewMediaVariantName =
  | "thumbnail"
  | "small"
  | "medium"
  | "large"
  | "original";

export type ReviewMediaSummary = {
  id: string;
  mediaType: "image" | "video";
  filename: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  isFeatured: boolean;
  processingStatus: string;
  sortOrder: number;
  hasBlob: boolean;
  blobKey: string | null;
  variants: Record<string, { pathname?: string; key?: string } | undefined>;
};

export type ReviewCardItem = {
  id: string;
  slug: string;
  vehicle: string;
  workDate: string | null;
  status: GalleryItemStatus;
  published: boolean;
  provisionalVehicle: boolean;
  shadePercentage: string | null;
  sourceMonthFolderName: string | null;
  driveFolderName: string | null;
  importScope: string | null;
  imageCount: number;
  videoCount: number;
  warningCount: number;
  processingReadyCount: number;
  processingPendingCount: number;
  processingFailedCount: number;
  coverMediaId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ReviewDetailItem = ReviewCardItem & {
  serviceType: string;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  media: ReviewMediaSummary[];
};

function parseVariants(raw: unknown): ReviewMediaSummary["variants"] {
  if (!raw || typeof raw !== "object") return {};
  return raw as ReviewMediaSummary["variants"];
}

export async function listReviewWorkspaceItems(): Promise<ReviewCardItem[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data: items, error } = await supabase
    .from("gallery_items")
    .select(
      "id, slug, vehicle, service_type, work_date, status, published, provisional_vehicle, validation_errors, drive_folder_name, source_month_folder_name, import_scope, shade_percentage, created_at, updated_at",
    )
    .eq("service_type", "Window Tint")
    .order("work_date", { ascending: false, nullsFirst: false })
    .limit(200);

  if (error || !items) {
    console.error("[review] listReviewWorkspaceItems:", error?.message);
    return [];
  }

  const cards = await Promise.all(
    items.map(async (item) => {
      const { data: media } = await supabase
        .from("gallery_media")
        .select(
          "id, media_type, is_featured, processing_status, blob_key, sort_order, validation_status",
        )
        .eq("gallery_item_id", item.id)
        .order("sort_order", { ascending: true });

      const rows = media || [];
      const images = rows.filter((m) => m.media_type === "image");
      const videos = rows.filter((m) => m.media_type === "video");
      const withBlob = (m: { blob_key: string | null }) => Boolean(m.blob_key);
      const featured =
        images.find((m) => m.is_featured && withBlob(m)) ||
        images.find(
          (m) => m.processing_status === "ready_for_review" && withBlob(m),
        ) ||
        images.find((m) => withBlob(m)) ||
        null;

      const warnings = Array.isArray(item.validation_errors)
        ? item.validation_errors.length
        : 0;

      return {
        id: item.id,
        slug: item.slug,
        vehicle: item.vehicle,
        workDate: item.work_date,
        status: item.status as GalleryItemStatus,
        published: item.published,
        provisionalVehicle: item.provisional_vehicle,
        shadePercentage: item.shade_percentage,
        sourceMonthFolderName: item.source_month_folder_name,
        driveFolderName: item.drive_folder_name,
        importScope: item.import_scope,
        imageCount: images.length,
        videoCount: videos.length,
        warningCount: warnings,
        processingReadyCount: rows.filter(
          (m) => m.processing_status === "ready_for_review",
        ).length,
        processingPendingCount: rows.filter(
          (m) =>
            m.processing_status === "pending_download" ||
            m.processing_status === "downloaded" ||
            m.processing_status === "processed",
        ).length,
        processingFailedCount: rows.filter(
          (m) => m.processing_status === "failed",
        ).length,
        coverMediaId: featured?.id ?? null,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      } satisfies ReviewCardItem;
    }),
  );

  return cards;
}

export async function getReviewDetailItem(
  id: string,
): Promise<ReviewDetailItem | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data: item, error } = await supabase
    .from("gallery_items")
    .select(
      "id, slug, vehicle, service_type, work_date, status, published, provisional_vehicle, validation_errors, drive_folder_name, source_month_folder_name, import_scope, shade_percentage, description, seo_title, seo_description, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !item) return null;

  const { data: media } = await supabase
    .from("gallery_media")
    .select(
      "id, drive_file_name, mime_type, media_type, width, height, is_featured, processing_status, blob_key, storage_pathname, variants, sort_order",
    )
    .eq("gallery_item_id", id)
    .order("sort_order", { ascending: true });

  const rows = media || [];
  const images = rows.filter((m) => m.media_type === "image");
  const videos = rows.filter((m) => m.media_type === "video");
  const withBlob = (m: {
    blob_key: string | null;
    storage_pathname: string | null;
  }) => Boolean(m.blob_key || m.storage_pathname);
  const featured =
    images.find((m) => m.is_featured && withBlob(m)) ||
    images.find(
      (m) => m.processing_status === "ready_for_review" && withBlob(m),
    ) ||
    images.find((m) => withBlob(m)) ||
    null;

  const warnings = Array.isArray(item.validation_errors)
    ? item.validation_errors.length
    : 0;

  return {
    id: item.id,
    slug: item.slug,
    vehicle: item.vehicle,
    workDate: item.work_date,
    status: item.status as GalleryItemStatus,
    published: item.published,
    provisionalVehicle: item.provisional_vehicle,
    shadePercentage: item.shade_percentage,
    sourceMonthFolderName: item.source_month_folder_name,
    driveFolderName: item.drive_folder_name,
    importScope: item.import_scope,
    imageCount: images.length,
    videoCount: videos.length,
    warningCount: warnings,
    processingReadyCount: rows.filter(
      (m) => m.processing_status === "ready_for_review",
    ).length,
    processingPendingCount: rows.filter(
      (m) =>
        m.processing_status === "pending_download" ||
        m.processing_status === "downloaded" ||
        m.processing_status === "processed",
    ).length,
    processingFailedCount: rows.filter((m) => m.processing_status === "failed")
      .length,
    coverMediaId: featured?.id ?? null,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    serviceType: item.service_type,
    description:
      "description" in item
        ? ((item as { description?: string | null }).description ?? null)
        : null,
    seoTitle: item.seo_title,
    seoDescription: item.seo_description,
    media: rows.map((m) => ({
      id: m.id,
      mediaType: m.media_type as "image" | "video",
      filename: m.drive_file_name || "file",
      mimeType: m.mime_type || "",
      width: m.width,
      height: m.height,
      isFeatured: Boolean(m.is_featured),
      processingStatus: m.processing_status || "pending_download",
      sortOrder: m.sort_order ?? 0,
      hasBlob: Boolean(m.blob_key || m.storage_pathname),
      blobKey: m.blob_key || m.storage_pathname,
      variants: parseVariants(m.variants),
    })),
  };
}

export function resolveMediaPathname(
  media: {
    blob_key?: string | null;
    storage_pathname?: string | null;
    variants?: unknown;
  },
  variant: ReviewMediaVariantName,
): string | null {
  if (variant === "original") {
    return media.blob_key || media.storage_pathname || null;
  }

  const variants = parseVariants(media.variants);
  const entry = variants[variant];
  if (entry?.pathname) return entry.pathname;
  if (entry?.key) return entry.key;

  // Prefer smaller derivative cascade for cards
  const cascade: ReviewMediaVariantName[] =
    variant === "thumbnail"
      ? ["thumbnail", "small", "medium", "large"]
      : variant === "small"
        ? ["small", "thumbnail", "medium", "large"]
        : variant === "medium"
          ? ["medium", "large", "small", "thumbnail"]
          : ["large", "medium", "small", "thumbnail"];

  for (const name of cascade) {
    const v = variants[name];
    if (v?.pathname) return v.pathname;
    if (v?.key) return v.key;
  }

  return media.blob_key || media.storage_pathname || null;
}
