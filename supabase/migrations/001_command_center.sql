-- AutoDV8ions Command Center
-- Run in Supabase SQL Editor or via migration tooling.
-- Does NOT modify tint_quote_leads or existing production tables.

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers (phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers (email);

-- Vehicles
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  year TEXT,
  make TEXT,
  model TEXT,
  color TEXT,
  vehicle_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_customer_id ON vehicles (customer_id);

-- Jobs
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  service_type TEXT NOT NULL DEFAULT 'Window Tint',
  status TEXT NOT NULL DEFAULT 'New',
  tint_percentage TEXT,
  customer_notes TEXT,
  internal_notes TEXT,
  source TEXT DEFAULT 'manual',
  tint_quote_lead_id UUID,
  google_calendar_event_id TEXT,
  google_calendar_event_url TEXT,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_service_type ON jobs (service_type);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_at ON jobs (scheduled_at);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  vehicle_summary TEXT,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  deposit NUMERIC(10, 2) NOT NULL DEFAULT 0,
  balance_due NUMERIC(10, 2) NOT NULL DEFAULT 0,
  paid BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_paid ON invoices (paid);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices (created_at DESC);

-- Content uploads (mirrors Google Drive folders)
CREATE TABLE IF NOT EXISTS content_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_folder_id TEXT UNIQUE,
  drive_folder_url TEXT,
  vehicle_name TEXT NOT NULL DEFAULT '',
  service_type TEXT NOT NULL DEFAULT 'Other',
  photos_count INTEGER NOT NULL DEFAULT 0,
  videos_count INTEGER NOT NULL DEFAULT 0,
  upload_date DATE,
  caption_reel TEXT,
  caption_facebook TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_uploads_upload_date ON content_uploads (upload_date DESC);

-- Gallery items (SEO recent work pages)
CREATE TABLE IF NOT EXISTS gallery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  vehicle TEXT NOT NULL,
  service_type TEXT NOT NULL,
  work_date DATE,
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  videos JSONB NOT NULL DEFAULT '[]'::jsonb,
  content_upload_id UUID REFERENCES content_uploads(id) ON DELETE SET NULL,
  seo_title TEXT,
  seo_description TEXT,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gallery_items_published ON gallery_items (published, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_gallery_items_slug ON gallery_items (slug);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS customers_updated_at ON customers;
CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS jobs_updated_at ON jobs;
CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS invoices_updated_at ON invoices;
CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
