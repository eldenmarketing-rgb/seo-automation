-- ─── Module catalogue des sites CMS (template site-starter) ────────────────
-- Décision du 2026-09-01 : les produits des sites e-com vitrine (conversion
-- téléphone, zéro panier) vivent en base, comme les pages CMS — un changement
-- de prix ou de dispo est en ligne sans commit ni deploy. Une table par
-- concept, filtrée par site_key, RLS anon en lecture seule.
--
-- Les tables historiques `vehicles` (Ideo-car/Okaz) et `menu_items`
-- (restaurant) ne bougent pas ; le bot /produit sera adapté plus tard.
--
-- Un produit `sold_out` RESTE visible de la clé anon : sa page affiche un
-- bandeau et le schema passe en OutOfStock — jamais de 404 sur une URL
-- indexée (leçon des 13 URL voitures en 404). `hidden` = retiré de la vente,
-- invisible du site ; le retrait définitif d'une URL passe par une
-- redirection posée dans seo_pages (redirect_to).

CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_key TEXT NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  -- Texte éditorial de repli de la page catégorie ; le vrai contenu SEO se
  -- rédige dans le dashboard (seo_pages, slug `categorie/<slug>`).
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (site_key, slug)
);

CREATE INDEX IF NOT EXISTS idx_product_categories_site ON product_categories(site_key);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_key TEXT NOT NULL,
  slug TEXT NOT NULL,
  category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2),
  -- « 70cl », « /personne », « la palette »…
  unit TEXT,
  -- Caractéristiques libres par niche (année, km, contenance, allergènes…),
  -- affichées telles quelles dans la fiche produit.
  attributes JSONB NOT NULL DEFAULT '{}',
  images TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'published'
    CHECK (status IN ('published', 'hidden', 'sold_out')),
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (site_key, slug)
);

CREATE INDEX IF NOT EXISTS idx_products_site ON products(site_key);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

COMMENT ON TABLE product_categories IS
  'Catégories du module catalogue des sites CMS (template site-starter) — la page catégorie est la page SEO.';
COMMENT ON TABLE products IS
  'Produits du module catalogue des sites CMS — sold_out reste servi (OutOfStock), hidden est invisible.';
COMMENT ON COLUMN products.attributes IS
  'Caractéristiques libres par niche (JSONB clé → valeur), affichées dans la fiche produit.';

-- ─── RLS : la clé anon lit, n'écrit jamais ─────────────────────────────────
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon reads categories" ON product_categories;
CREATE POLICY "anon reads categories" ON product_categories
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "anon reads visible products" ON products;
CREATE POLICY "anon reads visible products" ON products
  FOR SELECT
  TO anon
  USING (status IN ('published', 'sold_out'));
