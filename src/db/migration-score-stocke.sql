-- ═══════════════════════════════════════════════════════════════════════════
-- seo_pages : le Quality Score devient un fait stocké, plus un calcul de page
-- ═══════════════════════════════════════════════════════════════════════════
-- `/api/pages` recalculait le score des 279 pages à chaque appel, et le critère
-- d'unicité compare chaque page à toutes ses sœurs : 11 500 empreintes de texte
-- reconstruites par requête, 8,2 s de réponse mesurées le 2026-08-23. Chaque
-- changement de filtre repayait la facture entière. À 50 sites la liste devient
-- inutilisable.
--
-- Le score ne change pourtant que lorsque la page change. On le stocke, avec la
-- signature de ce qui a servi à le calculer : tant que la signature tient, on
-- relit un entier au lieu de refaire le calcul.
--
-- `score_signature` = `updated_at` de la page + `content_hash` du dernier crawl.
-- Ce sont les deux seules choses qui peuvent modifier la note : une édition dans
-- le CMS, ou un contenu servi qui a bougé. Une signature — et non une date de
-- péremption — parce que le crawl hebdomadaire réécrit `crawled_at` sur toutes
-- les URL sans que le contenu bouge : comparer les dates aurait fait tout
-- recalculer chaque lundi pour rien.
--
-- Le score reste dérivable : ces colonnes sont un cache, jamais une source. Les
-- effacer (UPDATE seo_pages SET score_signature = NULL) force un recalcul complet.
--
-- Exécution :
--   env -u SUPABASE_ACCESS_TOKEN npx tsx scripts/run-migration.ts src/db/migration-score-stocke.sql

ALTER TABLE seo_pages
  ADD COLUMN IF NOT EXISTS quality_score    smallint,
  ADD COLUMN IF NOT EXISTS score_source     text,
  ADD COLUMN IF NOT EXISTS score_profile_id text,
  ADD COLUMN IF NOT EXISTS score_signature  text,
  ADD COLUMN IF NOT EXISTS scored_at        timestamptz;

COMMENT ON COLUMN seo_pages.quality_score IS
  'Dernier Quality Score calculé (0-100). Cache dérivé de content / du rendu crawlé — '
  'jamais une saisie. NULL = jamais noté.';

COMMENT ON COLUMN seo_pages.score_source IS
  '« cms » (le corps en base fait foi) ou « rendu » (la page servie, lue par le crawler). '
  'Arbitré par src/lib/rendered-content.ts.';

COMMENT ON COLUMN seo_pages.score_profile_id IS
  'Archétype de contenu retenu pour la notation — le barème n''est pas le même pour toutes les pages.';

COMMENT ON COLUMN seo_pages.score_signature IS
  'Empreinte de ce qui a été noté : updated_at de la page + content_hash du dernier crawl. '
  'Signature identique = score encore valable. La vider force le recalcul.';

COMMENT ON COLUMN seo_pages.scored_at IS
  'Horodatage du calcul, pour distinguer une note fraîche d''une note héritée.';

-- Le rafraîchissement ne cherche que les pages dont la signature ne tient plus.
-- Sans index, ce balayage redeviendrait le coût qu'on vient de supprimer.
CREATE INDEX IF NOT EXISTS idx_seo_pages_score_signature
  ON seo_pages(site_key, score_signature);

-- ─── Écrire le cache ne doit pas être « modifier la page » ──────────────────
-- `trigger_seo_pages_updated` posait `updated_at = now()` sur TOUT UPDATE. Deux
-- conséquences, constatées le 2026-08-23 en écrivant les colonnes ci-dessus :
--
--   1. La signature ne tenait jamais — écrire le score déplaçait `updated_at`,
--      donc périmait le score qu'on venait d'écrire. Cache mort-né.
--   2. `updated_at` sert aussi à arbitrer CMS vs page servie
--      (src/lib/rendered-content.ts) : le bump faisait passer toutes les pages
--      pour « éditées à l'instant » et retournait la notation sur un corps vide.
--
-- La date de modification doit dire quand le CONTENU a bougé. On compare la
-- ligne moins les colonnes de cache : rien d'autre n'a changé, rien ne bouge.
-- Les autres tables gardent `update_updated_at()`, inchangée.

CREATE OR REPLACE FUNCTION seo_pages_touch_updated_at() RETURNS trigger AS $$
DECLARE
  cache constant text[] := ARRAY[
    'quality_score', 'score_source', 'score_profile_id', 'score_signature', 'scored_at', 'updated_at'
  ];
BEGIN
  IF (to_jsonb(NEW) - cache) IS DISTINCT FROM (to_jsonb(OLD) - cache) THEN
    NEW.updated_at := now();
  ELSE
    NEW.updated_at := OLD.updated_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_seo_pages_updated ON seo_pages;
CREATE TRIGGER trigger_seo_pages_updated
  BEFORE UPDATE ON seo_pages
  FOR EACH ROW EXECUTE FUNCTION seo_pages_touch_updated_at();
