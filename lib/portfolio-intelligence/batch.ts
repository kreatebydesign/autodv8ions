import { automotiveIntelligenceAdapter } from "./adapters/automotive";
import { analyzePortfolioItem } from "./analyze";
import {
  loadIntelligenceItemInput,
  loadLiveShowcaseForIntelligence,
  upsertPortfolioIntelligence,
} from "./persist";
import {
  PORTFOLIO_INTELLIGENCE_BATCH_LIMIT,
  PORTFOLIO_INTELLIGENCE_MODEL_VERSION,
} from "./types";

export async function analyzeGalleryItemIntelligence(galleryItemId: string) {
  const item = await loadIntelligenceItemInput(galleryItemId);
  if (!item) {
    return { ok: false as const, error: "Gallery item not found." };
  }

  const liveShowcase = await loadLiveShowcaseForIntelligence();
  const analysis = analyzePortfolioItem({
    item,
    liveShowcase,
    adapter: automotiveIntelligenceAdapter,
  });

  const saved = await upsertPortfolioIntelligence({
    galleryItemId,
    analysis,
  });
  if (!saved.ok) return saved;

  return { ok: true as const, analysis };
}

export async function analyzeReviewQueueBatch(input?: {
  ids?: string[];
  maxItems?: number;
  force?: boolean;
}) {
  const { getSupabaseAdmin } = await import("@/lib/supabase/server");
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false as const, error: "Database unavailable." };

  const maxItems = Math.min(
    input?.maxItems || PORTFOLIO_INTELLIGENCE_BATCH_LIMIT,
    PORTFOLIO_INTELLIGENCE_BATCH_LIMIT,
  );

  let targetIds = input?.ids || [];
  if (targetIds.length === 0) {
    const { data } = await supabase
      .from("gallery_items")
      .select("id")
      .in("status", ["pending_review", "draft"])
      .eq("published", false)
      .order("updated_at", { ascending: false })
      .limit(maxItems);
    targetIds = (data || []).map((row) => row.id);
  } else {
    targetIds = targetIds.slice(0, maxItems);
  }

  if (targetIds.length === 0) {
    return {
      ok: true as const,
      analyzed: 0,
      skipped: 0,
      results: [],
      modelVersion: PORTFOLIO_INTELLIGENCE_MODEL_VERSION,
    };
  }

  if (!input?.force) {
    const { data: existing } = await supabase
      .from("portfolio_intelligence")
      .select("gallery_item_id, model_version, stale_at")
      .in("gallery_item_id", targetIds);

    const fresh = new Set(
      (existing || [])
        .filter(
          (row) =>
            row.model_version === PORTFOLIO_INTELLIGENCE_MODEL_VERSION &&
            !row.stale_at,
        )
        .map((row) => row.gallery_item_id),
    );
    targetIds = targetIds.filter((id) => !fresh.has(id));
  }

  const liveShowcase = await loadLiveShowcaseForIntelligence();
  const results: Array<{ id: string; score: number; recommendation: string }> =
    [];
  let skipped = (input?.ids?.length || maxItems) - targetIds.length;

  for (const id of targetIds) {
    const item = await loadIntelligenceItemInput(id);
    if (!item) {
      skipped += 1;
      continue;
    }

    const analysis = analyzePortfolioItem({
      item,
      liveShowcase,
      adapter: automotiveIntelligenceAdapter,
    });
    const saved = await upsertPortfolioIntelligence({
      galleryItemId: id,
      analysis,
    });
    if (!saved.ok) {
      return { ok: false as const, error: saved.error };
    }

    results.push({
      id,
      score: analysis.portfolioScore,
      recommendation: analysis.recommendation,
    });
  }

  return {
    ok: true as const,
    analyzed: results.length,
    skipped,
    results,
    modelVersion: PORTFOLIO_INTELLIGENCE_MODEL_VERSION,
  };
}
