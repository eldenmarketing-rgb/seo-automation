-- SEO Automation Schema
-- Run this in Supabase SQL Editor

-- Pages SEO générées
CREATE TABLE IF NOT EXISTS seo_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_key TEXT NOT NULL,
  page_type TEXT NOT NULL CHECK (page_type IN ('city', 'service', 'city_service')),
  slug TEXT NOT NULL,
  city TEXT,
  service TEXT,
  meta_title TEXT NOT NULL,
  meta_description TEXT NOT NULL,
  h1 TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  schema_org JSONB,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'optimized', 'error')),
  version INT NOT NULL DEFAULT 1,
  deployed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(site_key, slug)
);

-- Index pour requêtes fréquentes
CREATE INDEX idx_seo_pages_site_status ON seo_pages(site_key, status);
CREATE INDEX idx_seo_pages_type ON seo_pages(page_type);

-- Positions Google Search Console
CREATE TABLE IF NOT EXISTS gsc_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_key TEXT NOT NULL,
  page_url TEXT NOT NULL,
  query TEXT NOT NULL,
  position FLOAT NOT NULL,
  clicks INT NOT NULL DEFAULT 0,
  impressions INT NOT NULL DEFAULT 0,
  ctr FLOAT NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gsc_site_date ON gsc_positions(site_key, date);
CREATE INDEX idx_gsc_position ON gsc_positions(position);
CREATE INDEX idx_gsc_page ON gsc_positions(page_url);

-- File d'attente d'optimisation
CREATE TABLE IF NOT EXISTS optimization_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seo_page_id UUID REFERENCES seo_pages(id) ON DELETE CASCADE,
  site_key TEXT NOT NULL,
  page_url TEXT NOT NULL,
  avg_position FLOAT NOT NULL,
  top_queries JSONB NOT NULL DEFAULT '[]',
  current_content JSONB,
  optimized_content JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'optimizing', 'optimized', 'deployed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_optqueue_status ON optimization_queue(status);
CREATE INDEX idx_optqueue_site ON optimization_queue(site_key);

-- Logs d'automatisation
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  site_key TEXT,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'warning', 'info')),
  duration_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_logs_job ON automation_logs(job_name, created_at DESC);
CREATE INDEX idx_logs_status ON automation_logs(status);

-- Fonction de mise à jour automatique du updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_seo_pages_updated
  BEFORE UPDATE ON seo_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Configuration bot Telegram par site
CREATE TABLE IF NOT EXISTS bot_settings (
  site_key TEXT PRIMARY KEY,
  phone TEXT,
  address TEXT,
  horaires JSONB DEFAULT '{}',
  promo_text TEXT,
  gbp_link TEXT,
  custom_cta TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_bot_settings_updated
  BEFORE UPDATE ON bot_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Images générées/uploadées pour les pages SEO
CREATE TABLE IF NOT EXISTS page_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_key TEXT NOT NULL,
  slug TEXT NOT NULL,
  image_type TEXT NOT NULL DEFAULT 'ai' CHECK (image_type IN ('ai', 'real', 'stock')),
  file_path TEXT NOT NULL,
  alt_text TEXT NOT NULL,
  width INT,
  height INT,
  size_kb INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(site_key, slug)
);

CREATE INDEX idx_page_images_site ON page_images(site_key);

-- Articles de blog
CREATE TABLE IF NOT EXISTS blog_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_key TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  meta_description TEXT,
  content TEXT NOT NULL,
  featured_image TEXT,
  tags TEXT[] DEFAULT '{}',
  internal_links JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(site_key, slug)
);

CREATE INDEX idx_blog_site_status ON blog_articles(site_key, status);

CREATE TRIGGER trigger_blog_articles_updated
  BEFORE UPDATE ON blog_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Catalogue véhicules d'occasion
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INT NOT NULL,
  km INT NOT NULL,
  price INT NOT NULL,
  fuel TEXT CHECK (fuel IN ('essence', 'diesel', 'hybride', 'electrique', 'gpl')),
  transmission TEXT CHECK (transmission IN ('manuelle', 'automatique')),
  color TEXT,
  doors INT,
  power_cv INT,
  description TEXT,
  seo_title TEXT,
  seo_description TEXT,
  photos TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold')),
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_brand ON vehicles(brand);
CREATE INDEX idx_vehicles_price ON vehicles(price);

CREATE TRIGGER trigger_vehicles_updated
  BEFORE UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Catégories du menu restaurant
CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_key TEXT NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(site_key, slug)
);

-- Articles du menu restaurant
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(6,2) NOT NULL,
  photo TEXT,
  allergens TEXT[] DEFAULT '{}',
  is_vegetarian BOOLEAN DEFAULT false,
  is_spicy BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'unavailable', 'seasonal')),
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_menu_items_status ON menu_items(status);

-- Vue : pages candidates à l'optimisation (position entre 5 et 15)
CREATE OR REPLACE VIEW v_optimization_candidates AS
SELECT
  sp.id AS seo_page_id,
  sp.site_key,
  sp.slug,
  sp.page_type,
  sp.h1,
  gp.page_url,
  AVG(gp.position) AS avg_position,
  SUM(gp.impressions) AS total_impressions,
  SUM(gp.clicks) AS total_clicks,
  JSONB_AGG(
    JSONB_BUILD_OBJECT('query', gp.query, 'position', gp.position, 'impressions', gp.impressions)
    ORDER BY gp.impressions DESC
  ) FILTER (WHERE gp.position BETWEEN 5 AND 15) AS top_queries
FROM gsc_positions gp
LEFT JOIN seo_pages sp ON sp.site_key = gp.site_key
  AND gp.page_url LIKE '%' || sp.slug || '%'
WHERE gp.date >= CURRENT_DATE - INTERVAL '28 days'
GROUP BY sp.id, sp.site_key, sp.slug, sp.page_type, sp.h1, gp.page_url
HAVING AVG(gp.position) BETWEEN 5 AND 15
ORDER BY total_impressions DESC;
