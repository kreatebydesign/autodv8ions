-- Phase 6A — Portfolio Intelligence + date integrity support
-- Additive. Does not alter editorial truth on gallery_items.

CREATE TABLE IF NOT EXISTS portfolio_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_item_id UUID NOT NULL REFERENCES gallery_items(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  recommendation TEXT NOT NULL,
  vehicle_category TEXT NOT NULL,
  quality_summary TEXT,
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  weaknesses JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggested_featured_media_id UUID REFERENCES gallery_media(id) ON DELETE SET NULL,
  suggested_gallery_order JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggested_pin BOOLEAN NOT NULL DEFAULT false,
  replacement_candidate_id UUID REFERENCES gallery_items(id) ON DELETE SET NULL,
  replacement_reason TEXT,
  confidence NUMERIC(4, 3) NOT NULL DEFAULT 0,
  model_version TEXT NOT NULL,
  ignored BOOLEAN NOT NULL DEFAULT false,
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  stale_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT portfolio_intelligence_gallery_item_id_key UNIQUE (gallery_item_id)
);

CREATE INDEX IF NOT EXISTS idx_portfolio_intelligence_score
  ON portfolio_intelligence (score DESC);

CREATE INDEX IF NOT EXISTS idx_portfolio_intelligence_analyzed_at
  ON portfolio_intelligence (analyzed_at DESC);

CREATE INDEX IF NOT EXISTS idx_portfolio_intelligence_recommendation
  ON portfolio_intelligence (recommendation);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'portfolio_intelligence_set_updated_at'
  ) THEN
    CREATE TRIGGER portfolio_intelligence_set_updated_at
      BEFORE UPDATE ON portfolio_intelligence
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
