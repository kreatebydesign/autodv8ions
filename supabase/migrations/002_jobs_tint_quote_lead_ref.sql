-- Link jobs to tint_quote_leads when lead id is numeric (bigint), not UUID.
-- Safe to run multiple times.

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS tint_quote_lead_ref TEXT;

CREATE INDEX IF NOT EXISTS idx_jobs_tint_quote_lead_ref ON jobs (tint_quote_lead_ref);
