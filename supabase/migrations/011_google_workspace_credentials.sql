-- 011_google_workspace_credentials.sql
-- Widen provider check so a single Workspace reconnect token can cover
-- Gmail + Calendar. Safe if 010 already allowed these values.

ALTER TABLE public.google_oauth_credentials
  DROP CONSTRAINT IF EXISTS google_oauth_credentials_provider_check;

ALTER TABLE public.google_oauth_credentials
  ADD CONSTRAINT google_oauth_credentials_provider_check
  CHECK (provider IN ('google_workspace', 'gmail', 'calendar'));

COMMENT ON TABLE public.google_oauth_credentials IS
  'Encrypted Google OAuth credentials for server-side integrations. App access via service role only. Primary provider: google_workspace (Gmail + Calendar).';
