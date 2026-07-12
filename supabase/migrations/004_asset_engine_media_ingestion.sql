-- Phase 2A — Media ingestion foundations (KXD Asset Engine → AutoDV8ions)
-- Additive only. Extends gallery_media for private storage + processing state.
-- Does not publish, delete Drive originals, or change gallery_items approval flow.

-- ---------------------------------------------------------------------------
-- Processing / storage columns on gallery_media
-- ---------------------------------------------------------------------------

ALTER TABLE gallery_media
  ADD COLUMN IF NOT EXISTS processing_status TEXT,
  ADD COLUMN IF NOT EXISTS processing_error TEXT,
  ADD COLUMN IF NOT EXISTS processing_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS blob_key TEXT,
  ADD COLUMN IF NOT EXISTS blob_provider TEXT,
  ADD COLUMN IF NOT EXISTS storage_pathname TEXT,
  ADD COLUMN IF NOT EXISTS original_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS derived_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS duration_seconds NUMERIC,
  ADD COLUMN IF NOT EXISTS variants JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS uploaded_to_storage_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_connector TEXT,
  ADD COLUMN IF NOT EXISTS source_object_id TEXT;

-- Backfill processing status for existing pending inventory rows
UPDATE gallery_media
SET processing_status = CASE
  WHEN blob_key IS NOT NULL AND processing_status IS NULL THEN 'ready_for_review'
  WHEN processing_status IS NULL THEN 'pending_download'
  ELSE processing_status
END
WHERE processing_status IS NULL;

ALTER TABLE gallery_media
  ALTER COLUMN processing_status SET DEFAULT 'pending_download';

UPDATE gallery_media
SET processing_status = 'pending_download'
WHERE processing_status IS NULL;

ALTER TABLE gallery_media
  ALTER COLUMN processing_status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gallery_media_processing_status_check'
  ) THEN
    ALTER TABLE gallery_media
      ADD CONSTRAINT gallery_media_processing_status_check
      CHECK (
        processing_status IN (
          'pending_download',
          'downloaded',
          'processed',
          'ready_for_review',
          'failed'
        )
      );
  END IF;
END $$;

-- Mirror Drive file id into generic source identity when present
UPDATE gallery_media
SET
  source_connector = COALESCE(source_connector, 'google_drive'),
  source_object_id = COALESCE(source_object_id, drive_file_id)
WHERE drive_file_id IS NOT NULL
  AND (source_object_id IS NULL OR source_connector IS NULL);

CREATE INDEX IF NOT EXISTS idx_gallery_media_processing_status
  ON gallery_media (processing_status);

CREATE INDEX IF NOT EXISTS idx_gallery_media_blob_key
  ON gallery_media (blob_key)
  WHERE blob_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gallery_media_source_object
  ON gallery_media (source_connector, source_object_id)
  WHERE source_object_id IS NOT NULL;
