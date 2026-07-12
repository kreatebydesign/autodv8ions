import type { PortfolioSyncMode, PortfolioSyncOptions } from "./types";

/** Public portfolio records are Window Tint only. */
export const PORTFOLIO_SERVICE_TYPE = "Window Tint" as const;

/** Drive folder names under UPLOAD HERE - RAW CONTENT */
export const TINT_JOBS_FOLDER_NAMES = [
  "Tint Jobs",
  "Tint-Jobs",
  "TintJobs",
] as const;

export const RAW_CONTENT_FOLDER_NAMES = [
  "UPLOAD HERE - RAW CONTENT",
  "UPLOAD HERE - RAW CONTENT ",
  "UPLOAD HERE",
] as const;

/** Folders that must never be imported into the public portfolio. */
export const EXCLUDED_TOP_LEVEL_NAMES = [
  "ARCHIVE",
  "Creative Assets",
  "EDITED / FINAL",
  "EDITED",
  "FINAL",
  "Audio Installs",
  "Security Installs",
  "Other",
  "Remote-Starters",
  "Remote Starters",
  "Custom-Mods",
  "Custom Mods",
  "Audio",
] as const;

export const SUPPORTED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

export const SUPPORTED_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
] as const;

/** Inventoried but not public-ready without conversion/review. */
export const REVIEW_VIDEO_MIME_TYPES = [
  "video/quicktime",
] as const;

export const DEFAULT_SYNC_MODE: PortfolioSyncMode =
  "current-and-previous-month";

export const DEFAULT_MAX_FOLDERS_PER_RUN = 25;

export function getDefaultSyncOptions(
  overrides: Partial<PortfolioSyncOptions> = {},
): PortfolioSyncOptions {
  return {
    mode: DEFAULT_SYNC_MODE,
    startDate: null,
    endDate: null,
    maxFolders: DEFAULT_MAX_FOLDERS_PER_RUN,
    now: new Date(),
    ...overrides,
  };
}

export function syncOptionsFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): PortfolioSyncOptions {
  const mode = (env.PORTFOLIO_SYNC_MODE as PortfolioSyncMode | undefined) ||
    DEFAULT_SYNC_MODE;

  const maxRaw = env.PORTFOLIO_SYNC_MAX_FOLDERS;
  const maxFolders = maxRaw
    ? Math.max(1, Number.parseInt(maxRaw, 10) || DEFAULT_MAX_FOLDERS_PER_RUN)
    : DEFAULT_MAX_FOLDERS_PER_RUN;

  return getDefaultSyncOptions({
    mode,
    startDate: env.PORTFOLIO_SYNC_START_DATE || null,
    endDate: env.PORTFOLIO_SYNC_END_DATE || null,
    maxFolders,
  });
}
