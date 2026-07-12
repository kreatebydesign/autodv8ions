/**
 * KXD Portfolio Engine — central showcase & retention defaults.
 * Client-specific values belong in portfolio_engine_settings (DB),
 * not hardcoded business logic elsewhere.
 */

export type PortfolioEngineLimits = {
  reviewQueueLimit: number;
  liveShowcaseLimit: number;
  homepageLimit: number;
  pinnedLimit: number;
  retentionDays: number;
};

/** Default limits — safe starting point for any KXD client portfolio. */
export const DEFAULT_PORTFOLIO_ENGINE_LIMITS: PortfolioEngineLimits = {
  reviewQueueLimit: 30,
  liveShowcaseLimit: 12,
  homepageLimit: 4,
  pinnedLimit: 3,
  retentionDays: 30,
};

export const PORTFOLIO_ENGINE_SETTINGS_ID = "default";
