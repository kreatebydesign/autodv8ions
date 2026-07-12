import type { ValidationWarning } from "@/lib/live-portfolio/types";

export type DiscoveryMediaKind = "image" | "video";

export type DiscoveryIgnoreReason =
  | "unsupported_mime"
  | "google_workspace_file"
  | "pdf"
  | "archive"
  | "hidden_or_system"
  | "thumbnail_like"
  | "empty_name"
  | "missing_id"
  | "folder_cap_reached"
  | "media_cap_reached"
  | "not_a_folder"
  | "unparsed_month_folder";

export type DiscoveredMediaFile = {
  fileId: string;
  fileName: string;
  mimeType: string;
  extension: string | null;
  mediaKind: DiscoveryMediaKind;
  createdTime: string | null;
  modifiedTime: string | null;
  /** Included only when Drive metadata already returned it. */
  webViewLink: string | null;
};

export type IgnoredDiscoveryItem = {
  id: string | null;
  name: string;
  mimeType: string | null;
  reason: DiscoveryIgnoreReason;
  detail?: string;
};

export type DiscoveredJobFolder = {
  folderId: string;
  folderName: string;
  createdTime: string | null;
  media: DiscoveredMediaFile[];
  ignored: IgnoredDiscoveryItem[];
  warnings: ValidationWarning[];
  mediaTruncated: boolean;
};

export type DiscoveredMonthFolder = {
  folderId: string;
  folderName: string;
  year: number | null;
  month: number | null;
  sortKey: string | null;
  parseOk: boolean;
  createdTime: string | null;
  jobs: DiscoveredJobFolder[];
  ignored: IgnoredDiscoveryItem[];
  warnings: ValidationWarning[];
  jobsTruncated: boolean;
};

export type DriveDiscoveryResult = {
  authMode: "wif" | "oauth_legacy" | "none";
  sourceFolderId: string;
  sourceFolderName: string;
  months: DiscoveredMonthFolder[];
  totals: {
    monthFolderCount: number;
    jobFolderCount: number;
    mediaFileCount: number;
    ignoredCount: number;
    warningCount: number;
  };
  truncated: {
    months: boolean;
    jobs: boolean;
    media: boolean;
  };
  warnings: ValidationWarning[];
  ignored: IgnoredDiscoveryItem[];
};

export type DriveDiscoveryPreviewResponse = {
  ok: boolean;
  authMode: "wif" | "oauth_legacy" | "none";
  rootFolder: { id: string; name: string } | null;
  monthFolderCount: number;
  jobFolderCount: number;
  mediaFileCount: number;
  ignoredCount: number;
  warningCount: number;
  truncated: {
    months: boolean;
    jobs: boolean;
    media: boolean;
  };
  months: Array<{
    folderId: string;
    folderName: string;
    year: number | null;
    month: number | null;
    sortKey: string | null;
    parseOk: boolean;
    jobCount: number;
    mediaCount: number;
    ignoredCount: number;
    warningCount: number;
    jobsTruncated: boolean;
    sampleJobs: Array<{
      folderId: string;
      folderName: string;
      mediaCount: number;
      sampleMedia: Array<{
        fileName: string;
        mimeType: string;
        mediaKind: DiscoveryMediaKind;
        extension: string | null;
      }>;
    }>;
  }>;
  warnings: ValidationWarning[];
  ignoredSample: IgnoredDiscoveryItem[];
  error?: { code: string; message: string };
};

export const DISCOVERY_LIMITS = {
  maxMonthFolders: 36,
  maxJobFoldersPerMonth: 40,
  maxJobFoldersTotal: 180,
  maxMediaFilesPerJob: 40,
  pageSize: 100,
  sampleMonths: 8,
  sampleJobsPerMonth: 3,
  sampleMediaPerJob: 3,
  ignoredSampleLimit: 20,
} as const;

export const DISCOVERY_SUPPORTED_IMAGE_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export const DISCOVERY_SUPPORTED_VIDEO_MIMES = [
  "video/mp4",
  "video/quicktime",
] as const;
