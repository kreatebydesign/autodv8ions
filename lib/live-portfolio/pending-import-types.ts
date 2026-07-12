import type {
  PlannedConflict,
  PlannedSkip,
  PlannedWarning,
} from "./import-plan-types";
import type { PendingImportLimits } from "./pending-import";

export type PendingImportTransactionResult = {
  mode: "per_job_compensating" | "in_memory";
  committed: boolean;
  rolledBack: boolean;
  jobsAttempted: number;
  jobsCommitted: number;
  jobsRolledBack: number;
  detail: string;
};

export type PendingImportBatchLimitsUsed = PendingImportLimits & {
  monthsSelected: number;
  itemsSelected: number;
  mediaSelected: number;
  remainingMonthsEstimate: number;
  remainingItemsEstimate: number;
  remainingMediaEstimate: number;
  truncatedByLimits: boolean;
};

export type PendingImportResultCounts = {
  createdGalleryItems: number;
  matchedGalleryItems: number;
  createdMedia: number;
  matchedMedia: number;
  skipped: number;
  conflicts: number;
  warnings: number;
};

export type PendingImportResponse = {
  ok: boolean;
  writesPerformed: boolean;
  authMode: "wif" | "oauth_legacy" | "none";
  counts: PendingImportResultCounts;
  skips: PlannedSkip[];
  conflicts: PlannedConflict[];
  warnings: PlannedWarning[];
  batchLimits: PendingImportBatchLimitsUsed;
  truncated: {
    months: boolean;
    jobs: boolean;
    media: boolean;
  };
  transaction: PendingImportTransactionResult;
  guarantee: string;
  schemaVerified?: boolean;
  samples?: {
    createdItems: Array<{
      id: string;
      driveFolderId: string;
      vehicle: string;
      status: string;
      published: boolean;
    }>;
    createdMedia: Array<{
      id: string;
      driveFileId: string;
      galleryItemId: string;
      storageUrl: null;
      validationStatus: string;
    }>;
  };
  error?: { code: string; message: string };
};

export type GalleryItemWriteRow = {
  id?: string;
  slug: string;
  vehicle: string;
  service_type: string;
  work_date: string | null;
  photos: unknown[];
  videos: unknown[];
  seo_title: null;
  seo_description: null;
  published: false;
  status: "pending_review";
  shade_percentage: null;
  drive_folder_id: string;
  drive_parent_folder_id: string | null;
  drive_folder_name: string;
  source_month_folder_name: string | null;
  provisional_vehicle: true;
  validation_errors: unknown[];
  import_scope: "recent";
};

export type GalleryMediaWriteRow = {
  id?: string;
  gallery_item_id: string;
  drive_file_id: string;
  drive_file_name: string;
  drive_created_at: string | null;
  drive_modified_at: string | null;
  storage_url: null;
  mime_type: string;
  media_type: "image" | "video";
  sort_order: number;
  is_featured: false;
  validation_status: "pending";
  rejected_reason: null;
};

export type PendingImportWriteStore = {
  begin(): void;
  commit(): void;
  rollback(): void;
  findItemByDriveFolderId(driveFolderId: string): { id: string } | null;
  findMediaByDriveFileId(driveFileId: string): { id: string; gallery_item_id: string } | null;
  insertItem(row: GalleryItemWriteRow): { id: string };
  insertMedia(row: GalleryMediaWriteRow): { id: string };
  deleteItem(id: string): void;
};
