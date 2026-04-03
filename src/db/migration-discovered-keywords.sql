-- Migration: discovered_keywords table
-- Stores keywords discovered via Google Suggest during daily generation

CREATE TABLE IF NOT EXISTS discovered_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_key TEXT NOT NULL,
  keyword TEXT NOT NULL,
  score INT NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'google_suggest',
  suggested_page TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(site_key, keyword)
);

CREATE INDEX idx_discovered_kw_site_status ON discovered_keywords(site_key, status);
CREATE INDEX idx_discovered_kw_score ON discovered_keywords(score DESC);
