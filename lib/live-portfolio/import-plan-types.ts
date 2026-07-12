import type { DiscoveryMediaKind } from "./discovery-types";
import type { ValidationWarning } from "./types";

export type GalleryItemMatchReason =
  | "drive_folder_id"
  | "none";

export type GalleryMediaMatchReason =
  | "drive_file_id"
  | "none";

export type PlannedGalleryDefaults = {
  status: "pending";
  published: false;
  featured: false;
  homepageVisible: false;
  publicMediaUrl: null;
};

export type PlannedItemCandidateMetadata = {
  sourceFolderName: string;
  sourceMonthFolderName: string | null;
  monthFolderId: string | null;
  year: number | null;
  month: number | null;
  sortKey: string | null;
  displayTitleCandidate: string;
  vehicleLabelCandidate: string;
  workDateCandidate: string | null;
  slugCandidate: string;
  provisionalVehicle: true;
};

export type ExistingGalleryItemSnapshot = {
  id: string;
  slug: string;
  vehicle: string;
  work_date: string | null;
  status: string;
  published: boolean;
  provisional_vehicle: boolean;
  drive_folder_id: string | null;
  drive_folder_name: string | null;
  source_month_folder_name: string | null;
  shade_percentage: string | null;
  seo_title: string | null;
  seo_description: string | null;
};

export type ExistingGalleryMediaSnapshot = {
  id: string;
  gallery_item_id: string;
  drive_file_id: string | null;
  drive_file_name: string;
  mime_type: string;
  media_type: string;
  is_featured: boolean;
  storage_url: string | null;
};

export type PlannedNewGalleryItem = {
  kind: "new_gallery_item";
  driveFolderId: string;
  driveParentFolderId: string | null;
  metadata: PlannedItemCandidateMetadata;
  defaults: PlannedGalleryDefaults;
  mediaFileIds: string[];
  warnings: ValidationWarning[];
};

export type PlannedExistingGalleryItemMatch = {
  kind: "existing_gallery_item_match";
  driveFolderId: string;
  matchReason: "drive_folder_id";
  existing: ExistingGalleryItemSnapshot;
  preserveHumanEditedMetadata: boolean;
  plannedMetadataIfProvisional: PlannedItemCandidateMetadata;
  defaultsNote: string;
  mediaFileIds: string[];
  warnings: ValidationWarning[];
};

export type PlannedNewGalleryMedia = {
  kind: "new_gallery_media";
  driveFileId: string;
  driveFileName: string;
  mimeType: string;
  mediaKind: DiscoveryMediaKind;
  extension: string | null;
  parentDriveFolderId: string;
  matchedGalleryItemId: string | null;
  defaults: {
    isFeatured: false;
    storageUrl: null;
    publicMediaUrl: null;
  };
};

export type PlannedExistingGalleryMediaMatch = {
  kind: "existing_gallery_media_match";
  driveFileId: string;
  matchReason: "drive_file_id";
  existing: ExistingGalleryMediaSnapshot;
  parentDriveFolderId: string;
  preserveFeaturedAndStorage: true;
};

export type PlannedSkip = {
  kind: "skip";
  subjectType: "job_folder" | "media_file" | "month_folder" | "other";
  subjectId: string | null;
  subjectName: string;
  reason: string;
  detail?: string;
};

export type PlannedConflict = {
  kind: "conflict";
  code:
    | "duplicate_folder_name_different_id"
    | "slug_collision_different_drive_id"
    | "media_name_collision_different_id"
    | "locked_item_name_drift";
  subjectId: string;
  subjectName: string;
  existingId?: string;
  detail: string;
};

export type PlannedWarning = ValidationWarning & {
  subjectType?: string;
  subjectId?: string | null;
};

export type PlannedUnsupported = {
  kind: "unsupported";
  subjectType: "media_file" | "other";
  subjectId: string | null;
  subjectName: string;
  reason: string;
  detail?: string;
};

export type PlannedMalformed = {
  kind: "malformed";
  subjectType: "job_folder" | "month_folder";
  subjectId: string | null;
  subjectName: string;
  reason: string;
  detail?: string;
};

export type DriveImportPlan = {
  writesPerformed: false;
  authMode: "wif" | "oauth_legacy" | "none";
  discovered: {
    monthFolderCount: number;
    jobFolderCount: number;
    mediaFileCount: number;
    ignoredCount: number;
    warningCount: number;
  };
  planned: {
    newGalleryItems: PlannedNewGalleryItem[];
    existingGalleryItemMatches: PlannedExistingGalleryItemMatch[];
    newGalleryMedia: PlannedNewGalleryMedia[];
    existingGalleryMediaMatches: PlannedExistingGalleryMediaMatch[];
    skips: PlannedSkip[];
    conflicts: PlannedConflict[];
    warnings: PlannedWarning[];
    unsupported: PlannedUnsupported[];
    malformed: PlannedMalformed[];
  };
  totals: {
    newGalleryItemCount: number;
    existingGalleryItemMatchCount: number;
    newGalleryMediaCount: number;
    existingGalleryMediaMatchCount: number;
    skipCount: number;
    conflictCount: number;
    warningCount: number;
    unsupportedCount: number;
    malformedCount: number;
  };
  truncated: {
    months: boolean;
    jobs: boolean;
    media: boolean;
  };
};

export type DriveImportPlanPreviewResponse = {
  ok: boolean;
  writesPerformed: false;
  authMode: "wif" | "oauth_legacy" | "none";
  discovered: DriveImportPlan["discovered"];
  totals: DriveImportPlan["totals"];
  truncated: DriveImportPlan["truncated"];
  samples: {
    newGalleryItems: Array<{
      driveFolderId: string;
      displayTitleCandidate: string;
      slugCandidate: string;
      mediaCount: number;
    }>;
    existingMatches: Array<{
      driveFolderId: string;
      existingId: string;
      existingVehicle: string;
      preserveHumanEditedMetadata: boolean;
    }>;
    conflicts: PlannedConflict[];
    skips: PlannedSkip[];
    warnings: PlannedWarning[];
  };
  guarantee: string;
  error?: { code: string; message: string };
};

export const IMPORT_PLAN_SAMPLE_LIMITS = {
  newItems: 8,
  existingMatches: 8,
  conflicts: 8,
  skips: 8,
  warnings: 8,
} as const;
