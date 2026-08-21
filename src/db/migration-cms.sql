-- ═══════════════════════════════════════════════════════════════════════
-- Migration CMS — Supabase devient la source de vérité du contenu des sites
-- Phase 1 : images multiples par page, mode de livraison par site, RLS
-- ═══════════════════════════════════════════════════════════════════════

-- ─── 1. page_images : plusieurs images par page ────────────────────────
-- L'UNIQUE(site_key, slug) limitait à UNE image par page : impossible
-- d'avoir un hero + des images de section + une galerie.
ALTER TABLE page_images DROP CONSTRAINT IF EXISTS page_images_site_key_slug_key;

ALTER TABLE page_images
  ADD COLUMN IF NOT EXISTS page_id     UUID REFERENCES seo_pages(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS role        TEXT NOT NULL DEFAULT 'section',
  ADD COLUMN IF NOT EXISTS position    INT  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bucket_path TEXT,
  ADD COLUMN IF NOT EXISTS public_url  TEXT;

ALTER TABLE page_images DROP CONSTRAINT IF EXISTS page_images_role_check;
ALTER TABLE page_images
  ADD CONSTRAINT page_images_role_check CHECK (role IN ('hero', 'section', 'gallery'));

CREATE INDEX IF NOT EXISTS idx_page_images_page ON page_images(page_id);
CREATE INDEX IF NOT EXISTS idx_page_images_slug ON page_images(site_key, slug);

-- ─── 2. site_profiles : mode de livraison + webhook de revalidation ────
-- 'files' = injection dans les fichiers du repo puis build Vercel (existant)
-- 'cms'   = le site lit Supabase, publication par revalidation à chaud
ALTER TABLE site_profiles
  ADD COLUMN IF NOT EXISTS delivery_mode     TEXT NOT NULL DEFAULT 'files',
  ADD COLUMN IF NOT EXISTS revalidate_url    TEXT,
  ADD COLUMN IF NOT EXISTS revalidate_secret TEXT;

ALTER TABLE site_profiles DROP CONSTRAINT IF EXISTS site_profiles_delivery_mode_check;
ALTER TABLE site_profiles
  ADD CONSTRAINT site_profiles_delivery_mode_check CHECK (delivery_mode IN ('files', 'cms'));

-- ─── 3. RLS sur seo_pages : les sites lisent en anon, publié seulement ──
-- Le dashboard et les scripts utilisent la service key, qui contourne RLS.
-- La clé anon (embarquée dans les sites Next.js) ne doit voir que le publié.
ALTER TABLE seo_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon reads published pages" ON seo_pages;
CREATE POLICY "anon reads published pages" ON seo_pages
  FOR SELECT
  TO anon
  USING (status = 'published');

-- Les images sont référencées par des pages publiques : lecture anon ouverte.
ALTER TABLE page_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon reads page images" ON page_images;
CREATE POLICY "anon reads page images" ON page_images
  FOR SELECT
  TO anon
  USING (true);
