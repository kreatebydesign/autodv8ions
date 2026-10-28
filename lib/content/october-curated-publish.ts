import { analyzeGalleryItemIntelligence } from "@/lib/portfolio-intelligence/batch";
import { updateGalleryPublishState } from "@/lib/live-portfolio/publish";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const OCTOBER_2026_MONTH_PATTERN = "2026-10";

export type CuratedPublishCandidate = {
  id: string;
  vehicle: string;
  score: number | null;
  ready: boolean;
  reason?: string;
};

export type CuratedOctoberPublishResult = {
  ok: boolean;
  discovered: number;
  eligible: number;
  selected: number;
  published: string[];
  pending: { vehicle: string; reason: string }[];
  errors: { vehicle: string; error: string }[];
};

const MIN_SCORE = 58;
const MAX_PUBLISH = 8;
const MIN_PUBLISH = 5;

function isReadyMedia(
  media: {
    media_type: string;
    processing_status: string | null;
    validation_status: string | null;
    blob_key: string | null;
    storage_pathname: string | null;
  }[],
) {
  if (media.length === 0) return false;
  const failed = media.some((m) => m.processing_status === "failed");
  const pending = media.some(
    (m) =>
      m.processing_status === "pending_download" ||
      m.processing_status === "downloaded" ||
      m.processing_status === "processed",
  );
  const readyImages = media.filter(
    (m) =>
      m.media_type === "image" &&
      m.processing_status === "ready_for_review" &&
      m.validation_status !== "rejected" &&
      Boolean(m.blob_key || m.storage_pathname),
  );
  return !failed && !pending && readyImages.length > 0;
}

/**
 * Publish the strongest eligible October 2026 tint jobs (5–8 when possible).
 * Uses portfolio intelligence scores; never invents metadata.
 */
export async function publishCuratedOctober2026(): Promise<CuratedOctoberPublishResult> {
  const supabase = getSupabaseAdmin();
  const empty: CuratedOctoberPublishResult = {
    ok: false,
    discovered: 0,
    eligible: 0,
    selected: 0,
    published: [],
    pending: [],
    errors: [],
  };

  if (!supabase) {
    return {
      ...empty,
      pending: [{ vehicle: "(all)", reason: "Database unavailable." }],
    };
  }

  const { data: items, error } = await supabase
    .from("gallery_items")
    .select(
      "id, vehicle, published, status, source_month_folder_name, validation_errors",
    )
    .eq("service_type", "Window Tint")
    .ilike("source_month_folder_name", `%${OCTOBER_2026_MONTH_PATTERN}%`)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      ...empty,
      pending: [{ vehicle: "(all)", reason: error.message }],
    };
  }

  const rows = items || [];
  const discovered = rows.length;
  const candidates: CuratedPublishCandidate[] = [];

  for (const item of rows) {
    if (item.published) continue;

    const { data: media } = await supabase
      .from("gallery_media")
      .select(
        "id, media_type, processing_status, validation_status, blob_key, storage_pathname",
      )
      .eq("gallery_item_id", item.id);

    const ready = isReadyMedia(media || []);
    if (!ready) {
      candidates.push({
        id: item.id,
        vehicle: item.vehicle,
        score: null,
        ready: false,
        reason: "Media not processed or not ready for publish.",
      });
      continue;
    }

    const analysis = await analyzeGalleryItemIntelligence(item.id);
    const score = analysis.ok ? analysis.analysis?.portfolioScore ?? 0 : 0;

    candidates.push({
      id: item.id,
      vehicle: item.vehicle,
      score,
      ready: true,
    });
  }

  const eligible = candidates.filter((c) => c.ready);
  const ranked = [...eligible].sort(
    (a, b) => (b.score ?? 0) - (a.score ?? 0),
  );

  const aboveThreshold = ranked.filter((c) => (c.score ?? 0) >= MIN_SCORE);
  let selected = aboveThreshold.slice(0, MAX_PUBLISH);

  if (selected.length < MIN_PUBLISH && ranked.length >= MIN_PUBLISH) {
    selected = ranked.slice(0, MIN_PUBLISH);
  } else if (selected.length === 0 && ranked.length > 0) {
    selected = ranked.slice(0, Math.min(MAX_PUBLISH, ranked.length));
  }

  const published: string[] = [];
  const errors: { vehicle: string; error: string }[] = [];
  const pending: { vehicle: string; reason: string }[] = [];

  for (const pick of selected) {
    const result = await updateGalleryPublishState({
      id: pick.id,
      action: "publish",
      approvedBy: "curated-october-2026",
    });
    if (result.ok) {
      published.push(pick.vehicle);
    } else {
      errors.push({ vehicle: pick.vehicle, error: result.error });
    }
  }

  for (const c of candidates) {
    if (c.ready && !selected.some((s) => s.id === c.id) && !published.includes(c.vehicle)) {
      pending.push({
        vehicle: c.vehicle,
        reason:
          selected.length >= MAX_PUBLISH
            ? "Strong work held back to limit batch size."
            : `Below quality threshold (score ${c.score ?? 0}).`,
      });
    }
    if (!c.ready) {
      pending.push({
        vehicle: c.vehicle,
        reason: c.reason || "Not ready.",
      });
    }
  }

  return {
    ok: errors.length === 0,
    discovered,
    eligible: eligible.length,
    selected: selected.length,
    published,
    pending,
    errors,
  };
}
