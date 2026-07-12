import {
  DEFAULT_PORTFOLIO_ENGINE_LIMITS,
  PORTFOLIO_ENGINE_SETTINGS_ID,
  type PortfolioEngineLimits,
} from "@/lib/portfolio-engine/config";
import { getSupabaseAdmin } from "@/lib/supabase/server";

function clampLimit(value: unknown, fallback: number) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(Math.floor(n), 500);
}

export async function getPortfolioEngineLimits(): Promise<PortfolioEngineLimits> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ...DEFAULT_PORTFOLIO_ENGINE_LIMITS };

  const { data, error } = await supabase
    .from("portfolio_engine_settings")
    .select(
      "review_queue_limit, live_showcase_limit, homepage_limit, pinned_limit, retention_days",
    )
    .eq("id", PORTFOLIO_ENGINE_SETTINGS_ID)
    .maybeSingle();

  if (error || !data) {
    return { ...DEFAULT_PORTFOLIO_ENGINE_LIMITS };
  }

  return {
    reviewQueueLimit: clampLimit(
      data.review_queue_limit,
      DEFAULT_PORTFOLIO_ENGINE_LIMITS.reviewQueueLimit,
    ),
    liveShowcaseLimit: clampLimit(
      data.live_showcase_limit,
      DEFAULT_PORTFOLIO_ENGINE_LIMITS.liveShowcaseLimit,
    ),
    homepageLimit: clampLimit(
      data.homepage_limit,
      DEFAULT_PORTFOLIO_ENGINE_LIMITS.homepageLimit,
    ),
    pinnedLimit: clampLimit(
      data.pinned_limit,
      DEFAULT_PORTFOLIO_ENGINE_LIMITS.pinnedLimit,
    ),
    retentionDays: clampLimit(
      data.retention_days,
      DEFAULT_PORTFOLIO_ENGINE_LIMITS.retentionDays,
    ),
  };
}

export async function updatePortfolioEngineLimits(
  patch: Partial<PortfolioEngineLimits>,
): Promise<
  { ok: true; limits: PortfolioEngineLimits } | { ok: false; error: string }
> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Database unavailable." };

  const current = await getPortfolioEngineLimits();
  const next: PortfolioEngineLimits = {
    reviewQueueLimit: clampLimit(
      patch.reviewQueueLimit ?? current.reviewQueueLimit,
      current.reviewQueueLimit,
    ),
    liveShowcaseLimit: clampLimit(
      patch.liveShowcaseLimit ?? current.liveShowcaseLimit,
      current.liveShowcaseLimit,
    ),
    homepageLimit: clampLimit(
      patch.homepageLimit ?? current.homepageLimit,
      current.homepageLimit,
    ),
    pinnedLimit: clampLimit(
      patch.pinnedLimit ?? current.pinnedLimit,
      current.pinnedLimit,
    ),
    retentionDays: clampLimit(
      patch.retentionDays ?? current.retentionDays,
      current.retentionDays,
    ),
  };

  const { error } = await supabase.from("portfolio_engine_settings").upsert({
    id: PORTFOLIO_ENGINE_SETTINGS_ID,
    review_queue_limit: next.reviewQueueLimit,
    live_showcase_limit: next.liveShowcaseLimit,
    homepage_limit: next.homepageLimit,
    pinned_limit: next.pinnedLimit,
    retention_days: next.retentionDays,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, limits: next };
}
