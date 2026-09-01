-- Migration : textes de présentation par site pour les inscriptions annuaires
-- (module Backlinks — copier-coller depuis /backlinks, édités sur /sites).
-- Exécution :
--   env -u SUPABASE_ACCESS_TOKEN npx tsx scripts/run-migration.ts src/db/migration-site-descriptions.sql

ALTER TABLE site_profiles
  ADD COLUMN IF NOT EXISTS description_short text,  -- 1-2 phrases (annuaires à champ court)
  ADD COLUMN IF NOT EXISTS description_long  text;  -- paragraphe complet (fiches détaillées)
