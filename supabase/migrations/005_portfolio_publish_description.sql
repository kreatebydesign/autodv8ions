-- Phase 4A — Public portfolio publishing
-- Additive editorial description for published gallery pages.
-- Does not alter Drive, Blob, or Asset Engine processing.

ALTER TABLE gallery_items
  ADD COLUMN IF NOT EXISTS description TEXT;
