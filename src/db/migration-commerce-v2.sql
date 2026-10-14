-- ─── Module commerce v2 (template ecom-starter, refonte boutique 2026-10-14) ──
-- • photo de catégorie : la mosaïque des catégories de l'accueil et le header
--   en ont besoin ; repli côté site = première photo du premier produit.
-- • index sur products.created_at : badge « Nouveau » (< 30 j) et tri
--   « nouveautés » de la page catégorie.
--
-- Exécution :
--   env -u SUPABASE_ACCESS_TOKEN npx tsx scripts/run-migration.ts src/db/migration-commerce-v2.sql

ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS image TEXT;
COMMENT ON COLUMN product_categories.image IS
  'Photo de la catégorie (URL publique), affichée dans la mosaïque de l''accueil et le menu.';

CREATE INDEX IF NOT EXISTS idx_products_site_created ON products(site_key, created_at DESC);
