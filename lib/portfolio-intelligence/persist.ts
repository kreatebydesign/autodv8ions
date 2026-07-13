import { getSupabaseAdmin } from "@/lib/supabase/server";
import type {
  IntelligenceItemInput,
  LiveShowcaseItemInput,
  PortfolioIntelligenceAnalysis,
  PortfolioIntelligenceRecord,
} from "./types";

type DbIntelligenceRow = {
  gallery_item_id: string;
  score: number;
  recommendation: string;
  vehicle_category: string;
  quality_summary: string | null;
  reasons: unknown;
  weaknesses: unknown;
  suggested_featured_media_id: string | null;
  suggested_gallery_order: unknown;
  suggested_pin: boolean;
  replacement_candidate_id: string | null;
  replacement_reason: string | null;
  confidence: number | string;
  model_version: string;
  ignored: boolean;
  analyzed_at: string;
  stale_at: string | null;
};

function mapRow(row: DbIntelligenceRow): PortfolioIntelligenceRecord {
  return {
    galleryItemId: row.gallery_item_id,
    portfolioScore: row.score,
    recommendation: row.recommendation as PortfolioIntelligenceRecord["recommendation"],
    vehicleCategory: row.vehicle_category as PortfolioIntelligenceRecord["vehicleCategory"],
    qualitySummary: row.quality_summary || "",
    reasons: Array.isArray(row.reasons) ? (row.reasons as string[]) : [],
    weaknesses: Array.isArray(row.weaknesses) ? (row.weaknesses as string[]) : [],
    suggestedFeaturedMediaId: row.suggested_featured_media_id,
    suggestedGalleryOrder: Array.isArray(row.suggested_gallery_order)
      ? (row.suggested_gallery_order as string[])
      : [],
    suggestedPin: row.suggested_pin,
    replacementCandidateId: row.replacement_candidate_id,
    replacementReason: row.replacement_reason,
    confidence: Number(row.confidence),
    modelVersion: row.model_version,
    ignored: row.ignored,
    analyzedAt: row.analyzed_at,
    staleAt: row.stale_at,
  };
}

export async function getPortfolioIntelligenceMap(
  galleryItemIds: string[],
): Promise<Map<string, PortfolioIntelligenceRecord>> {
  const supabase = getSupabaseAdmin();
  const map = new Map<string, PortfolioIntelligenceRecord>();
  if (!supabase || galleryItemIds.length === 0) return map;

  const { data, error } = await supabase
    .from("portfolio_intelligence")
    .select("*")
    .in("gallery_item_id", galleryItemIds);

  if (error || !data) {
    console.error("[portfolio-intelligence] getPortfolioIntelligenceMap:", error?.message);
    return map;
  }

  for (const row of data as DbIntelligenceRow[]) {
    map.set(row.gallery_item_id, mapRow(row));
  }

  return map;
}

export async function getPortfolioIntelligence(
  galleryItemId: string,
): Promise<PortfolioIntelligenceRecord | null> {
  const map = await getPortfolioIntelligenceMap([galleryItemId]);
  return map.get(galleryItemId) || null;
}

export async function upsertPortfolioIntelligence(input: {
  galleryItemId: string;
  analysis: PortfolioIntelligenceAnalysis;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Database unavailable." };

  const { error } = await supabase.from("portfolio_intelligence").upsert(
    {
      gallery_item_id: input.galleryItemId,
      score: input.analysis.portfolioScore,
      recommendation: input.analysis.recommendation,
      vehicle_category: input.analysis.vehicleCategory,
      quality_summary: input.analysis.qualitySummary,
      reasons: input.analysis.reasons,
      weaknesses: input.analysis.weaknesses,
      suggested_featured_media_id: input.analysis.suggestedFeaturedMediaId,
      suggested_gallery_order: input.analysis.suggestedGalleryOrder,
      suggested_pin: input.analysis.suggestedPin,
      replacement_candidate_id: input.analysis.replacementCandidateId,
      replacement_reason: input.analysis.replacementReason,
      confidence: input.analysis.confidence,
      model_version: input.analysis.modelVersion,
      analyzed_at: new Date().toISOString(),
      stale_at: null,
    },
    { onConflict: "gallery_item_id" },
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function setPortfolioIntelligenceIgnored(
  galleryItemId: string,
  ignored: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Database unavailable." };

  const { error } = await supabase
    .from("portfolio_intelligence")
    .update({ ignored })
    .eq("gallery_item_id", galleryItemId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function loadIntelligenceItemInput(
  galleryItemId: string,
): Promise<IntelligenceItemInput | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data: item, error } = await supabase
    .from("gallery_items")
    .select(
      "id, vehicle, work_date, description, shade_percentage, published, pinned, created_at, drive_folder_name",
    )
    .eq("id", galleryItemId)
    .maybeSingle();

  if (error || !item) return null;

  const { data: media } = await supabase
    .from("gallery_media")
    .select(
      "id, drive_file_name, media_type, width, height, bytes, processing_status, blob_key, storage_pathname, sort_order, is_featured",
    )
    .eq("gallery_item_id", galleryItemId)
    .order("sort_order", { ascending: true });

  return {
    id: item.id,
    vehicle: item.vehicle,
    workDate: item.work_date,
    description:
      "description" in item
        ? ((item as { description?: string | null }).description ?? null)
        : null,
    shadePercentage: item.shade_percentage,
    published: item.published,
    pinned: Boolean(
      "pinned" in item ? (item as { pinned?: boolean | null }).pinned : false,
    ),
    createdAt: item.created_at,
    driveFolderName: item.drive_folder_name,
    media: (media || []).map((m) => ({
      id: m.id,
      mediaType: m.media_type as "image" | "video",
      filename: m.drive_file_name || "file",
      width: m.width,
      height: m.height,
      bytes: m.bytes,
      processingStatus: m.processing_status || "pending_download",
      hasBlob: Boolean(m.blob_key || m.storage_pathname),
      sortOrder: m.sort_order ?? 0,
      isFeatured: Boolean(m.is_featured),
    })),
  };
}

export async function loadLiveShowcaseForIntelligence(): Promise<
  LiveShowcaseItemInput[]
> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data: items } = await supabase
    .from("gallery_items")
    .select("id, vehicle, published_at, pinned")
    .eq("published", true)
    .order("published_at", { ascending: true });

  if (!items || items.length === 0) return [];

  const ids = items.map((item) => item.id);
  const intelligence = await getPortfolioIntelligenceMap(ids);

  return items.map((item) => {
    const intel = intelligence.get(item.id);
    return {
      id: item.id,
      vehicle: item.vehicle,
      vehicleCategory: intel?.vehicleCategory || "other",
      portfolioScore: intel?.portfolioScore || 55,
      publishedAt:
        "published_at" in item
          ? ((item as { published_at?: string | null }).published_at ?? null)
          : null,
      pinned: Boolean(
        "pinned" in item ? (item as { pinned?: boolean | null }).pinned : false,
      ),
    };
  });
}

export async function applyPortfolioIntelligenceSuggestions(input: {
  galleryItemId: string;
  featuredMediaId?: string | null;
  galleryOrder?: string[];
  markHomepageCandidate?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Database unavailable." };

  if (input.featuredMediaId) {
    const { data: owned } = await supabase
      .from("gallery_media")
      .select("id")
      .eq("gallery_item_id", input.galleryItemId)
      .eq("id", input.featuredMediaId)
      .maybeSingle();
    if (!owned) return { ok: false, error: "Suggested featured media not found." };

    await supabase
      .from("gallery_media")
      .update({ is_featured: false })
      .eq("gallery_item_id", input.galleryItemId);
    await supabase
      .from("gallery_media")
      .update({ is_featured: true })
      .eq("id", input.featuredMediaId);
  }

  if (input.galleryOrder && input.galleryOrder.length > 0) {
    for (let index = 0; index < input.galleryOrder.length; index += 1) {
      const mediaId = input.galleryOrder[index];
      await supabase
        .from("gallery_media")
        .update({ sort_order: index })
        .eq("gallery_item_id", input.galleryItemId)
        .eq("id", mediaId);
    }
  }

  if (input.markHomepageCandidate) {
    const { error } = await supabase
      .from("portfolio_intelligence")
      .update({ recommendation: "homepage_feature" })
      .eq("gallery_item_id", input.galleryItemId);
    if (error) return { ok: false, error: error.message };
  }

  return { ok: true };
}
