-- CRM dashboard enhancements: outbound email log, follow-up reminders, review request tracking.
-- Safe to run multiple times (IF NOT EXISTS / conditional alters).

CREATE TABLE IF NOT EXISTS job_outbound_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  to_email text NOT NULL,
  subject text NOT NULL,
  body_text text NOT NULL,
  provider text NOT NULL DEFAULT 'resend' CHECK (provider IN ('resend')),
  resend_message_id text,
  content_fingerprint text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE job_outbound_emails
  ADD COLUMN IF NOT EXISTS resend_message_id text;

ALTER TABLE job_outbound_emails
  ADD COLUMN IF NOT EXISTS content_fingerprint text;

CREATE UNIQUE INDEX IF NOT EXISTS job_outbound_emails_resend_message_id_uidx
  ON job_outbound_emails (resend_message_id)
  WHERE resend_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS job_outbound_emails_job_fingerprint_idx
  ON job_outbound_emails (job_id, content_fingerprint, sent_at DESC);

CREATE INDEX IF NOT EXISTS job_outbound_emails_job_id_sent_at_idx
  ON job_outbound_emails (job_id, sent_at DESC);

CREATE TABLE IF NOT EXISTS job_follow_up_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'cancelled')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS job_follow_up_reminders_due_status_idx
  ON job_follow_up_reminders (status, due_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS job_follow_up_reminders_job_id_idx
  ON job_follow_up_reminders (job_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'jobs'
      AND column_name = 'review_request_sent_at'
  ) THEN
    ALTER TABLE jobs ADD COLUMN review_request_sent_at timestamptz;
  END IF;
END $$;

-- Match 008: service role only; deny anon/authenticated direct access.
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['job_outbound_emails', 'job_follow_up_reminders'];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'skip missing table: public.%', t;
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = t
        AND c.relkind = 'r'
        AND c.relrowsecurity = false
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      RAISE NOTICE 'enabled RLS: public.%', t;
    END IF;
  END LOOP;
END $$;
