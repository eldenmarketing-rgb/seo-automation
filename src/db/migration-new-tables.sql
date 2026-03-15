-- Migration : Ajout des 6 nouvelles tables
-- À exécuter dans Supabase SQL Editor
-- Date : 2026-03-12

-- 1. Configuration bot Telegram par site
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

DROP TRIGGER IF EXISTS trigger_bot_settings_updated ON bot_settings;
CREATE TRIGGER trigger_bot_settings_updated
  BEFORE UPDATE ON bot_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 2. Images des pages SEO
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

CREATE INDEX IF NOT EXISTS idx_page_images_site ON page_images(site_key);

-- 3. Articles de blog
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

CREATE INDEX IF NOT EXISTS idx_blog_site_status ON blog_articles(site_key, status);

DROP TRIGGER IF EXISTS trigger_blog_articles_updated ON blog_articles;
CREATE TRIGGER trigger_blog_articles_updated
  BEFORE UPDATE ON blog_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 4. Catalogue véhicules (table existe déjà avec colonnes FR : marque, modele, annee, prix, carburant, boite, couleur, puissance)
-- Ajout des colonnes manquantes uniquement
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS doors INT;

CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_marque ON vehicles(marque);
CREATE INDEX IF NOT EXISTS idx_vehicles_prix ON vehicles(prix);

DROP TRIGGER IF EXISTS trigger_vehicles_updated ON vehicles;
CREATE TRIGGER trigger_vehicles_updated
  BEFORE UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 5. Catégories du menu restaurant
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

-- 6. Articles du menu restaurant
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

CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_status ON menu_items(status);
