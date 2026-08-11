-- 008_enable_rls_public_app_tables.sql
-- Phase 2: eliminate rls_disabled_in_public for AutoDV8ions application tables.
--
-- Context:
-- - App writes/reads only via SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).
-- - No anon/authenticated policies are created (deny-by-default for those roles).
-- - portfolio_intelligence is intentionally omitted: not present in production
--   PostgREST schema as of this migration.
--
-- Safe to re-run: enables RLS only when the table exists and RLS is currently off.
-- Established apply path: Supabase SQL Editor (see COMMAND_CENTER_SETUP.md).

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'customers',
    'vehicles',
    'jobs',
    'invoices',
    'content_uploads',
    'gallery_items',
    'gallery_media',
    'tint_quote_leads',
    'portfolio_engine_settings'
  ];
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
    ELSE
      RAISE NOTICE 'RLS already enabled (or not a plain table): public.%', t;
    END IF;
  END LOOP;
END $$;
