-- ═══════════════════════════════════════════════════════════════════════════
-- crawl_results.content_extract : le contenu tel qu'il est RENDU
-- ═══════════════════════════════════════════════════════════════════════════
-- Le Quality Score notait `seo_pages.content`, c'est-à-dire ce que le CMS croit
-- avoir écrit. Constat du 2026-08-23 : 156 pages en ligne n'ont pas de corps en
-- base — leur contenu est rendu par le code du site — et le score annonçait
-- « 0 mot, 0 section, 0 FAQ » sur des pages de 1 800 mots parfaitement
-- structurées. Il conseillait d'allonger des pages déjà complètes.
--
-- Le crawler voit la vérité : il télécharge la page et la parse déjà. On lui
-- demande simplement de conserver ce qu'il a lu, dans la forme que le score
-- sait interpréter (intro / seoSections / faq / internalLinks).
--
-- Rétention : seul le dernier passage porte un extrait. Tout le reste du
-- système lit `v_crawl_latest`, donc un extrait plus ancien serait du poids
-- mort — la purge est faite par `scripts/crawl.ts` après chaque écriture.
-- L'historique des faits (statuts, funnel, anomalies) reste entier.
--
-- Exécution :
--   env -u SUPABASE_ACCESS_TOKEN npx tsx scripts/run-migration.ts src/db/migration-crawl-extrait-rendu.sql

ALTER TABLE crawl_results
  ADD COLUMN IF NOT EXISTS content_extract JSONB;

COMMENT ON COLUMN crawl_results.content_extract IS
  'Contenu rendu remis dans la forme du CMS (intro/seoSections/faq/internalLinks). '
  'Source du Quality Score pour les pages que le CMS n''a pas écrites. '
  'Seul le dernier passage le porte : les passages antérieurs sont purgés.';

-- La vue expose `c.*` : Postgres a figé la liste des colonnes à sa création.
-- On la recrée pour que la nouvelle colonne y apparaisse.
CREATE OR REPLACE VIEW v_crawl_latest AS
WITH dernier_run AS (
  SELECT DISTINCT ON (site_key) site_key, run_id
  FROM crawl_results
  ORDER BY site_key, crawled_at DESC
)
SELECT DISTINCT ON (c.site_key, c.url) c.*
FROM crawl_results c
JOIN dernier_run d ON d.site_key = c.site_key AND d.run_id = c.run_id
ORDER BY c.site_key, c.url, c.crawled_at DESC;
