-- Phase 5A — KXD Portfolio Engine (rolling showcase + retention)
-- Additive. Does not delete Drive originals, gallery rows, or editorial history.

-- ---------------------------------------------------------------------------
-- Lifecycle columns
-- ---------------------------------------------------------------------------

ALTER TABLE gallery_items
  ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS blob_purged_at TIMESTAMPTZ;

ALTER TABLE gallery_media
  ADD COLUMN IF NOT EXISTS blob_purged_at TIMESTAMPTZ;

-- Backfill published_at from approved_at when already public
UPDATE gallery_items
SET published_at = COALESCE(published_at, approved_at, updated_at, created_at)
WHERE published = true AND published_at IS NULL;

-- Expand status vocabulary (drop legacy check, add new)
ALTER TABLE gallery_items DROP CONSTRAINT IF EXISTS gallery_items_status_check;

-- Migrate legacy statuses before re-applying constraint
UPDATE gallery_items
SET status = CASE
  WHEN status = 'pending' THEN 'pending_review'
  WHEN status = 'approved' AND published = true THEN 'published'
  WHEN status = 'approved' AND published = false THEN 'draft'
  WHEN status = 'rejected' THEN 'failed'
  WHEN status = 'archived' THEN 'archived'
  ELSE status
END
WHERE status IN ('pending', 'approved', 'rejected');

ALTER TABLE gallery_items
  ALTER COLUMN status SET DEFAULT 'pending_review';

ALTER TABLE gallery_items
  ADD CONSTRAINT gallery_items_status_check
  CHECK (
    status IN (
      'pending_review',
      'draft',
      'published',
      'archived',
      'archived_review',
      'failed',
      -- temporary compatibility while old rows finish migrating
      'pending',
      'approved',
      'rejected'
    )
  );

CREATE INDEX IF NOT EXISTS idx_gallery_items_pinned_published
  ON gallery_items (pinned, published, published_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_gallery_items_status_archived_at
  ON gallery_items (status, archived_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_gallery_media_blob_purged
  ON gallery_media (blob_purged_at)
  WHERE blob_purged_at IS NULL;

-- ---------------------------------------------------------------------------
-- Engine settings (one row, configurable from Portfolio Settings)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS portfolio_engine_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  review_queue_limit INTEGER NOT NULL DEFAULT 30,
  live_showcase_limit INTEGER NOT NULL DEFAULT 12,
  homepage_limit INTEGER NOT NULL DEFAULT 4,
  pinned_limit INTEGER NOT NULL DEFAULT 3,
  retention_days INTEGER NOT NULL DEFAULT 30,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT portfolio_engine_settings_positive CHECK (
    review_queue_limit > 0
    AND live_showcase_limit > 0
    AND homepage_limit > 0
    AND pinned_limit > 0
    AND retention_days > 0
  )
);

INSERT INTO portfolio_engine_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS portfolio_engine_settings_updated_at ON portfolio_engine_settings;
CREATE TRIGGER portfolio_engine_settings_updated_at
  BEFORE UPDATE ON portfolio_engine_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
