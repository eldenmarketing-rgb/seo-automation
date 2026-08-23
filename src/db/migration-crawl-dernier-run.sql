-- ═══════════════════════════════════════════════════════════════════════════
-- v_crawl_latest : ne montrer que ce que le DERNIER passage a réellement vu
-- ═══════════════════════════════════════════════════════════════════════════
-- La vue rendait « le dernier état connu de chaque URL », sans limite d'âge.
-- Conséquence constatée le 2026-08-23 : les 13 URL de ideo-car réparées le jour
-- même (elles redirigent désormais en 308) restaient affichées en 404. Elles
-- n'étaient plus liées nulle part, donc plus crawlées — et leur ligne d'avant la
-- correction survivait indéfiniment, alimentant des actions sur un problème déjà
-- résolu.
--
-- Une URL qui sort du périmètre (plus en base, plus au sitemap, plus liée) sort
-- donc du diagnostic. C'est la lecture honnête : nous ne l'observons plus. Son
-- historique reste entier dans `crawl_results`.
--
-- Contrepartie assumée : un passage interrompu en cours de route ne donne qu'une
-- photo partielle du site. Mieux vaut un diagnostic incomplet qu'un diagnostic
-- périmé — un fait vieux de trois semaines est présenté ici comme un fait du jour.
--
-- Exécution :
--   env -u SUPABASE_ACCESS_TOKEN npx tsx scripts/run-migration.ts src/db/migration-crawl-dernier-run.sql

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
