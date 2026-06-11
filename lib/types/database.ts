import type { JobStatus, ServiceType } from "@/lib/constants/jobs";

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
  created_at: string;
};
