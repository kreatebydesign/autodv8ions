export type GalleryItemStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "archived";

export type ImportScope = "recent" | "historical";

export type PortfolioSyncMode =
  | "current-and-previous-month"
  | "current-month-only"
  | "historical-backfill"
  | "date-range"
  | "all-controlled";

export type MediaType = "image" | "video";

export type MediaValidationStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "needs_review";

export type ValidationWarning = {
  code: string;
  message: string;
};

export type ParsedMonthFolder = {
  rawName: string;
  ok: boolean;
  year: number | null;
  month: number | null;
  warnings: ValidationWarning[];
};

export type ParsedVehicleFolder = {
  rawName: string;
  vehicle: string;
  day: number | null;
  workDate: string | null;
  provisionalVehicle: boolean;
  warnings: ValidationWarning[];
};

export type PortfolioSyncOptions = {
  mode: PortfolioSyncMode;
  /** Inclusive YYYY-MM-DD */
  startDate?: string | null;
  /** Inclusive YYYY-MM-DD */
  endDate?: string | null;
  maxFolders: number;
  /** Reference "now" for tests */
  now?: Date;
};

export type DriveFileInventory = {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string | null;
  modifiedTime?: string | null;
  size?: string | number | null;
};

export type InventoriedMedia = {
  driveFileId: string;
  driveFileName: string;
  driveCreatedAt: string | null;
  driveModifiedAt: string | null;
  mimeType: string;
  mediaType: MediaType | null;
  bytes: number | null;
  sortOrder: number;
  isFeatured: boolean;
  validationStatus: MediaValidationStatus;
  rejectedReason: string | null;
  warnings: ValidationWarning[];
};
