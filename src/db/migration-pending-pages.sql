-- Migration: pending_pages table
-- Stores scored page candidates awaiting approval before generation

CREATE TABLE IF NOT EXISTS pending_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_key TEXT NOT NULL,
  slug TEXT NOT NULL,
  page_type TEXT NOT NULL CHECK (page_type IN ('city', 'service', 'city_service')),
  service_slug TEXT,
  city_slug TEXT,
  score INT NOT NULL DEFAULT 0,
  score_details TEXT,
  status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'rejected', 'generating', 'generated', 'error')),
  batch_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(site_key, slug)
);

CREATE INDEX idx_pending_pages_status ON pending_pages(status);
CREATE INDEX idx_pending_pages_site_status ON pending_pages(site_key, status);
CREATE INDEX idx_pending_pages_score ON pending_pages(score DESC);
CREATE INDEX idx_pending_pages_batch ON pending_pages(batch_id);

CREATE TRIGGER trigger_pending_pages_updated
  BEFORE UPDATE ON pending_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
