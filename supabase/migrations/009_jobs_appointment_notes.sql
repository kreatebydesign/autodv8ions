-- Optional operational notes for appointments (sync to Google Calendar description only).
-- Internal notes remain CRM-private and must never sync to Calendar.
-- Safe to run multiple times.

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS appointment_notes TEXT;
