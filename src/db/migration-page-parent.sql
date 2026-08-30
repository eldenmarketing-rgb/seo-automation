-- ─── Page parente ───────────────────────────────────────────────────────────
-- Constat du 2026-08-30 : la page « nettoyage Diogène » (Debarras) est née à
-- la racine du site alors que toutes les prestations vivent sous /prestations
-- et sont listées par le hub « Nos services ». Le dashboard fabriquait le slug
-- depuis le mot-clé sans savoir où la page devait vivre.
--
-- Une page se rattache à sa page parente (hub « Nos services », catégorie
-- produit, hub blog…). C'est le parent qui fixe le préfixe d'URL et la liste
-- dans laquelle la page apparaît côté site. Les parents sont des lignes de
-- seo_pages (page_type hub / category), souvent en statut `external`
-- (rendues par le code) — ça suffit, ils servent de référence.

ALTER TABLE seo_pages
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES seo_pages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_seo_pages_parent ON seo_pages(parent_id) WHERE parent_id IS NOT NULL;

COMMENT ON COLUMN seo_pages.parent_id IS
  'Page parente (hub, catégorie) : fixe le préfixe d''URL et la liste où la page apparaît côté site.';
