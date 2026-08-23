-- ═══════════════════════════════════════════════════════════════════════════
-- B5 — une mesure d'impact enregistre aussi l'état du funnel d'indexation
-- ═══════════════════════════════════════════════════════════════════════════
-- Une mesure qui ne contient que des clics ne sait pas dire pourquoi elle a
-- bougé. Sur ce portefeuille, la plupart des actions visent des pages que
-- Google ne connaît pas : leur premier effet ne sera pas « +3 clics », ce sera
-- « passée de inconnue à indexée ». Sans cette colonne, l'action paraîtrait
-- sans effet pendant des semaines, et on la jugerait inutile à tort.
--
-- Les valeurs viennent du dernier crawl connu au moment de la mesure
-- (`v_crawl_latest`), pas d'une re-vérification : une mesure doit être
-- reproductible, elle enregistre ce qu'on savait à cet instant.
--
-- Exécution :
--   env -u SUPABASE_ACCESS_TOKEN npx tsx scripts/run-migration.ts src/db/migration-mesure-funnel.sql

ALTER TABLE seo_measurements
  ADD COLUMN IF NOT EXISTS funnel_stage   text,
  ADD COLUMN IF NOT EXISTS indexed        boolean,
  ADD COLUMN IF NOT EXISTS issues         text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS crawled_at     timestamptz;

COMMENT ON COLUMN seo_measurements.funnel_stage IS
  'Étape du funnel d''indexation au moment de la mesure (crawl_results)';
COMMENT ON COLUMN seo_measurements.indexed IS
  'La page était-elle indexée à cet instant — le premier effet attendu de la plupart des actions';
