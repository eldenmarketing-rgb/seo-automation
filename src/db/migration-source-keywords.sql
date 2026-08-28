-- ═══════════════════════════════════════════════════════════════════════════
-- `keywords` entre au vocabulaire des provenances d'action
-- ═══════════════════════════════════════════════════════════════════════════
-- Le détecteur de repli (2026-08-23) propose des pages à partir des mots-clés
-- validés à la main, pour les sites que Search Console ne voit pas — carrosserie
-- fait 19 impressions sur 28 jours, un site neuf en fait zéro, et leur backlog
-- serait resté vide. Cette provenance n'existait pas : `dataforseo` désignerait
-- l'outil qui a fourni le volume, pas le fait qu'un humain ait validé le
-- mot-clé, et c'est précisément cette validation qui autorise l'action.
--
-- Exécution :
--   env -u SUPABASE_ACCESS_TOKEN npx tsx scripts/run-migration.ts src/db/migration-source-keywords.sql

ALTER TABLE opportunities DROP CONSTRAINT IF EXISTS opportunities_sources_check;
ALTER TABLE opportunities ADD CONSTRAINT opportunities_sources_check
  CHECK (sources <@ ARRAY['gsc','crawl','dataforseo','keywords','serp','cluster','backlinks','manual']::text[]);
