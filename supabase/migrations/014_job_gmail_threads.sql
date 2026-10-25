-- Job ↔ Gmail thread associations (Communications V3 Stage A).
-- Service role only; deny anon/authenticated direct access.

CREATE TABLE IF NOT EXISTS job_gmail_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  gmail_thread_id text NOT NULL,
  customer_email text NOT NULL,
  is_primary boolean NOT NULL DEFAULT true,
  link_source text NOT NULL DEFAULT 'manual'
    CHECK (link_source IN ('manual', 'auto_single', 'import_legacy')),
  linked_at timestamptz NOT NULL DEFAULT now(),
  linked_by_admin text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT job_gmail_threads_job_thread_uidx UNIQUE (job_id, gmail_thread_id)
);

CREATE INDEX IF NOT EXISTS job_gmail_threads_job_id_idx
  ON job_gmail_threads (job_id);

CREATE INDEX IF NOT EXISTS job_gmail_threads_gmail_thread_id_idx
  ON job_gmail_threads (gmail_thread_id);

CREATE UNIQUE INDEX IF NOT EXISTS job_gmail_threads_one_primary_per_job_uidx
  ON job_gmail_threads (job_id)
  WHERE is_primary = true;

CREATE UNIQUE INDEX IF NOT EXISTS job_gmail_threads_one_primary_per_gmail_thread_uidx
  ON job_gmail_threads (gmail_thread_id)
  WHERE is_primary = true;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'job_gmail_threads'
      AND c.relkind = 'r'
      AND c.relrowsecurity = false
  ) THEN
    ALTER TABLE public.job_gmail_threads ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

COMMENT ON TABLE public.job_gmail_threads IS
  'Explicit job ↔ Gmail thread links for admin messaging. Service role only; no direct client access.';
