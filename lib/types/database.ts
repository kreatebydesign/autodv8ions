import type { JobStatus, ServiceType } from "@/lib/constants/jobs";
import type {
  GalleryItemStatus,
  ImportScope,
  MediaType,
  MediaValidationStatus,
  ValidationWarning,
} from "@/lib/live-portfolio/types";

export type Customer = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
};

export type Vehicle = {
  id: string;
  customer_id: string | null;
  year: string | null;
  make: string | null;
  model: string | null;
  color: string | null;
  vehicle_type: string | null;
  created_at: string;
};

export type Job = {
  id: string;
  customer_id: string | null;
  vehicle_id: string | null;
  service_type: ServiceType | string;
  status: JobStatus | string;
  tint_percentage: string | null;
  customer_notes: string | null;
  internal_notes: string | null;
  source: string | null;
  tint_quote_lead_id: string | null;
  tint_quote_lead_ref: string | null;
  google_calendar_event_id: string | null;
  google_calendar_event_url: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  customers?: Customer | null;
  vehicles?: Vehicle | null;
};

export type InvoiceLineItem = {
  description: string;
  amount: number;
};

export type Invoice = {
  id: string;
  job_id: string | null;
  customer_id: string | null;
  vehicle_summary: string | null;
  line_items: InvoiceLineItem[];
  deposit: number;
  balance_due: number;
  paid: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customers?: Customer | null;
};

export type ContentUpload = {
  id: string;
  drive_folder_id: string | null;
  drive_folder_url: string | null;
  vehicle_name: string;
  service_type: string;
  photos_count: number;
  videos_count: number;
  upload_date: string | null;
  caption_reel: string | null;
  caption_facebook: string | null;
  synced_at: string;
  created_at: string;
};

export type GalleryItem = {
  id: string;
  slug: string;
  vehicle: string;
  service_type: string;
  work_date: string | null;
  photos: string[];
  videos: string[];
  content_upload_id: string | null;
  seo_title: string | null;
  seo_description: string | null;
  published: boolean;
  status: GalleryItemStatus;
  shade_percentage: string | null;
  drive_folder_id: string | null;
  drive_parent_folder_id: string | null;
  drive_folder_name: string | null;
  source_month_folder_name: string | null;
  provisional_vehicle: boolean;
  validation_errors: ValidationWarning[];
  approved_at: string | null;
  approved_by: string | null;
  import_scope: ImportScope | null;
  created_at: string;
  updated_at: string;
};

export type GalleryMedia = {
  id: string;
  gallery_item_id: string;
  drive_file_id: string | null;
  drive_file_name: string;
  drive_modified_at: string | null;
  drive_created_at: string | null;
  storage_url: string | null;
  mime_type: string;
  media_type: MediaType;
  width: number | null;
  height: number | null;
  bytes: number | null;
  content_hash: string | null;
  sort_order: number;
  is_featured: boolean;
  orientation: string | null;
  validation_status: MediaValidationStatus;
  rejected_reason: string | null;
  processing_status?:
    | "pending_download"
    | "downloaded"
    | "processed"
    | "ready_for_review"
    | "failed";
  processing_error?: string | null;
  processing_attempts?: number;
  processed_at?: string | null;
  blob_key?: string | null;
  blob_provider?: string | null;
  storage_pathname?: string | null;
  original_mime_type?: string | null;
  derived_mime_type?: string | null;
  duration_seconds?: number | null;
  variants?: Record<string, unknown>;
  uploaded_to_storage_at?: string | null;
  source_connector?: string | null;
  source_object_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type PortfolioListItem = {
  id: string;
  slug: string;
  vehicle: string;
  service_type: string;
  work_date: string | null;
  status: GalleryItemStatus;
  published: boolean;
  provisional_vehicle: boolean;
  validation_errors: ValidationWarning[] | unknown;
  drive_folder_id: string | null;
  drive_folder_name: string | null;
  source_month_folder_name: string | null;
  import_scope: ImportScope | null;
  shade_percentage: string | null;
  updated_at?: string;
  created_at?: string;
  image_count: number;
  video_count: number;
  warning_count: number;
};
