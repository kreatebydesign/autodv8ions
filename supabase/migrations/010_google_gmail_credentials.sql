-- 010_google_oauth_credentials.sql
-- Encrypted Google Workspace OAuth refresh-token storage for admin reconnect.
-- Covers Gmail + Calendar (single refresh token, both scopes).
-- Does not modify customers, jobs, appointments, or email content tables.

CREATE TABLE IF NOT EXISTS public.google_oauth_credentials (
  provider text PRIMARY KEY,
  mailbox_email text NOT NULL,
  refresh_token_encrypted text NOT NULL,
  scopes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT google_oauth_credentials_provider_check
    CHECK (provider IN ('google_workspace', 'gmail', 'calendar'))
);

ALTER TABLE public.google_oauth_credentials ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.google_oauth_credentials IS
  'Encrypted Google OAuth credentials for server-side integrations. App access via service role only. Primary provider: google_workspace (Gmail + Calendar).';
