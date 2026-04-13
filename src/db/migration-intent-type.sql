-- Migration: Add intent classification columns to discovered_keywords and keyword_clusters
-- Run via: psql or Supabase SQL editor

ALTER TABLE discovered_keywords ADD COLUMN IF NOT EXISTS intent_type TEXT;
ALTER TABLE keyword_clusters ADD COLUMN IF NOT EXISTS dominant_intent TEXT;
CREATE INDEX IF NOT EXISTS idx_discovered_kw_intent ON discovered_keywords(intent_type);
