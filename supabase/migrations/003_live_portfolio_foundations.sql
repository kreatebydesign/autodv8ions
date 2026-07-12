-- Live Portfolio Engine — Phase 0 foundations
-- Extends gallery_items for tint-job Drive sync with approval workflow.
-- Adds normalized gallery_media. Safe / additive. Does not drop legacy JSONB.

-- ---------------------------------------------------------------------------
-- gallery_items extensions
-- ---------------------------------------------------------------------------

ALTER TABLE gallery_items
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS shade_percentage TEXT,
  ADD COLUMN IF NOT EXISTS drive_folder_id TEXT,
  ADD COLUMN IF NOT EXISTS drive_parent_folder_id TEXT,
  ADD COLUMN IF NOT EXISTS drive_folder_name TEXT,
  ADD COLUMN IF NOT EXISTS source_month_folder_name TEXT,
  ADD COLUMN IF NOT EXISTS provisional_vehicle BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by TEXT,
  ADD COLUMN IF NOT EXISTS import_scope TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Backfill status from published without unpublishing existing public records
UPDATE gallery_items
SET status = CASE
  WHEN published = true THEN 'approved'
  ELSE 'pending'
END
WHERE status IS NULL;

ALTER TABLE gallery_items
  ALTER COLUMN status SET DEFAULT 'pending';

UPDATE gallery_items
SET status = 'pending'
WHERE status IS NULL;

ALTER TABLE gallery_items
  ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gallery_items_status_check'
  ) THEN
    ALTER TABLE gallery_items
      ADD CONSTRAINT gallery_items_status_check
      CHECK (status IN ('pending', 'approved', 'rejected', 'archived'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gallery_items_import_scope_check'
  ) THEN
    ALTER TABLE gallery_items
      ADD CONSTRAINT gallery_items_import_scope_check
      CHECK (
        import_scope IS NULL
        OR import_scope IN ('recent', 'historical')
      );
  END IF;
END $$;

-- Stable Drive identity for idempotent sync (PostgreSQL allows multiple NULLs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gallery_items_drive_folder_id_key'
  ) THEN
    ALTER TABLE gallery_items
      ADD CONSTRAINT gallery_items_drive_folder_id_key UNIQUE (drive_folder_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_gallery_items_status
  ON gallery_items (status);

CREATE INDEX IF NOT EXISTS idx_gallery_items_status_work_date
  ON gallery_items (status, work_date DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_gallery_items_import_scope
  ON gallery_items (import_scope);

-- updated_at trigger (reuses set_updated_at from 001 if present)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS gallery_items_updated_at ON gallery_items;
CREATE TRIGGER gallery_items_updated_at
  BEFORE UPDATE ON gallery_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Approved rows should keep provisional_vehicle=false when already public
UPDATE gallery_items
SET provisional_vehicle = false
WHERE status = 'approved' AND published = true;

-- ---------------------------------------------------------------------------
-- gallery_media (normalized inventory; storage_url filled in later phases)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gallery_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_item_id UUID NOT NULL REFERENCES gallery_items(id) ON DELETE CASCADE,
  drive_file_id TEXT,
  drive_file_name TEXT NOT NULL DEFAULT '',
  drive_modified_at TIMESTAMPTZ,
  drive_created_at TIMESTAMPTZ,
  storage_url TEXT,
  mime_type TEXT NOT NULL DEFAULT '',
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  width INTEGER,
  height INTEGER,
  bytes BIGINT,
  content_hash TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  orientation TEXT,
  validation_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (validation_status IN ('pending', 'accepted', 'rejected', 'needs_review')),
  rejected_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gallery_media_item_drive_file_key'
  ) THEN
    ALTER TABLE gallery_media
      ADD CONSTRAINT gallery_media_item_drive_file_key
      UNIQUE (gallery_item_id, drive_file_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_gallery_media_gallery_item_id
  ON gallery_media (gallery_item_id);

CREATE INDEX IF NOT EXISTS idx_gallery_media_sort
  ON gallery_media (gallery_item_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_gallery_media_featured
  ON gallery_media (gallery_item_id)
  WHERE is_featured = true;

DROP TRIGGER IF EXISTS gallery_media_updated_at ON gallery_media;
CREATE TRIGGER gallery_media_updated_at
  BEFORE UPDATE ON gallery_media
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
