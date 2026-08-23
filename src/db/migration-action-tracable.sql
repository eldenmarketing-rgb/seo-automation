-- ═══════════════════════════════════════════════════════════════════════════
-- A3 — action traçable + contenu versionné
-- ═══════════════════════════════════════════════════════════════════════════
-- Deux trous se répondent :
--   1. `opportunities` ne sait d'une action terminée que `completed_at`. Ni qui
--      l'a approuvée, ni qui l'a exécutée, ni sur quel contenu, ni par quel
--      déploiement.
--   2. `seo_pages.version` s'incrémente mais aucun instantané n'est conservé :
--      la version N-1 est écrasée définitivement. Carrossier-pro est en prod en
--      mode CMS — une mauvaise publication est en ligne en 1 à 2 s, sans retour.
--
-- Principe : l'historique est append-only et garanti par Postgres, pas par la
-- discipline des appelants. Sept chemins d'écriture touchent `seo_pages`
-- aujourd'hui et A2 va tous les réécrire : seul un trigger tient cette promesse.
--
-- Exécution :
--   env -u SUPABASE_ACCESS_TOKEN npx tsx scripts/run-migration.ts src/db/migration-action-tracable.sql
-- Puis backfill (idempotent) :
--   npx tsx scripts/backfill-page-revisions.ts

-- ─── 1. seo_page_revisions : l'historique ───────────────────────────────────
-- `revision_number` (séquence immuable de l'historique) est distinct de
-- `page_version` (version métier portée par seo_pages) : deux écritures sur une
-- même version métier doivent produire deux révisions, pas un conflit avalé.
--
-- `quality_score` est nullable et rempli par l'application : le score est
-- recalculé à la volée par lib/quality-score.ts, un trigger SQL ne peut pas le
-- produire. Il vaut « score au moment T » et n'est pas comparable d'une version
-- de profil de contenu à l'autre.

CREATE TABLE IF NOT EXISTS seo_page_revisions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id          uuid NOT NULL REFERENCES seo_pages(id) ON DELETE RESTRICT,
  revision_number  integer NOT NULL,
  page_version     integer,

  site_key         text NOT NULL,
  slug             text NOT NULL,

  meta_title       text,
  meta_description text,
  h1               text,
  content          jsonb,
  schema_org       jsonb,
  status           text,

  quality_score    real,
  change_reason    text,
  change_author    text,
  opportunity_id   uuid REFERENCES opportunities(id) ON DELETE SET NULL,

  created_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_page_revision UNIQUE (page_id, revision_number)
);

CREATE INDEX IF NOT EXISTS idx_revisions_page    ON seo_page_revisions(page_id, revision_number DESC);
CREATE INDEX IF NOT EXISTS idx_revisions_site    ON seo_page_revisions(site_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_revisions_action  ON seo_page_revisions(opportunity_id);

-- Les révisions contiennent le contenu intégral de TOUS les brouillons du
-- réseau. Les sites CMS embarquent la clé anon dans leur bundle : sans RLS,
-- chaque brouillon deviendrait publiquement lisible. Aucune policy anon —
-- seule la service key (dashboard, jobs, scripts) lit cette table.
ALTER TABLE seo_page_revisions ENABLE ROW LEVEL SECURITY;

-- ─── 2. Le trigger : aucun chemin d'écriture n'échappe à l'historique ───────

CREATE OR REPLACE FUNCTION seo_pages_capture_revision() RETURNS trigger AS $$
DECLARE
  next_number integer;
BEGIN
  -- Un UPDATE qui ne touche à rien de substantiel (deployed_at, updated_at,
  -- ou un statut réécrit à l'identique par /api/pipeline) ne produit rien.
  IF TG_OP = 'UPDATE' AND NOT (
       NEW.meta_title       IS DISTINCT FROM OLD.meta_title
    OR NEW.meta_description IS DISTINCT FROM OLD.meta_description
    OR NEW.h1               IS DISTINCT FROM OLD.h1
    OR NEW.content          IS DISTINCT FROM OLD.content
    OR NEW.schema_org       IS DISTINCT FROM OLD.schema_org
    OR NEW.status           IS DISTINCT FROM OLD.status
  ) THEN
    RETURN NULL;
  END IF;

  -- Sans ce verrou, deux écritures concurrentes sur la même page calculeraient
  -- le même numéro et l'une des deux échouerait sur uq_page_revision.
  PERFORM pg_advisory_xact_lock(hashtext(NEW.id::text)::bigint);

  SELECT COALESCE(MAX(revision_number), 0) + 1
    INTO next_number
    FROM seo_page_revisions
   WHERE page_id = NEW.id;

  INSERT INTO seo_page_revisions (
    page_id, revision_number, page_version, site_key, slug,
    meta_title, meta_description, h1, content, schema_org, status
  ) VALUES (
    NEW.id, next_number, NEW.version, NEW.site_key, NEW.slug,
    NEW.meta_title, NEW.meta_description, NEW.h1, NEW.content, NEW.schema_org, NEW.status
  );

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_seo_pages_revision ON seo_pages;
CREATE TRIGGER trg_seo_pages_revision
  AFTER INSERT OR UPDATE ON seo_pages
  FOR EACH ROW EXECUTE FUNCTION seo_pages_capture_revision();

-- ─── 3. Ce qui est réellement en ligne ──────────────────────────────────────
-- `status = 'published'` ne veut pas dire « servi » : publishViaCms passe le
-- statut AVANT de revalider et le laisse publié si la revalidation échoue ; le
-- chemin fichiers publie même quand le deploy hook renvoie une erreur.
-- Sans cette colonne, un rollback n'est pas vérifiable.

ALTER TABLE seo_pages
  ADD COLUMN IF NOT EXISTS deployed_revision_id uuid REFERENCES seo_page_revisions(id) ON DELETE RESTRICT;

-- ─── 4. Traçabilité des actions ─────────────────────────────────────────────
-- Additif sur `opportunities` — pas de table parallèle.
-- `executed_via` et non `delivery_mode` : `opportunities.mode` existe déjà et
-- porte le mode du SITE (local/thematic/product). Deux colonnes voisines au sens
-- sans rapport finiraient confondues.

ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS risk_level   text NOT NULL DEFAULT 'medium',
  -- Niveau figé au moment de l'approbation. `risk_level` est réévalué à chaque
  -- scan (les clics de la page bougent) : sans cette photo, on ne pourrait pas
  -- détecter qu'une action approuvée en « medium » est devenue « high » depuis.
  -- Ce n'est pas une valeur calculée stockée, c'est un fait historique.
  ADD COLUMN IF NOT EXISTS approved_risk_level text,
  ADD COLUMN IF NOT EXISTS approved_at  timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by  text,
  ADD COLUMN IF NOT EXISTS executed_at  timestamptz,
  ADD COLUMN IF NOT EXISTS executed_by  text,
  ADD COLUMN IF NOT EXISTS executed_via text,
  ADD COLUMN IF NOT EXISTS deploy_ref   text,
  ADD COLUMN IF NOT EXISTS git_commit   text,
  ADD COLUMN IF NOT EXISTS sources      text[] NOT NULL DEFAULT '{}';

ALTER TABLE opportunities DROP CONSTRAINT IF EXISTS opportunities_risk_level_check;
ALTER TABLE opportunities ADD CONSTRAINT opportunities_risk_level_check
  CHECK (risk_level IN ('low', 'medium', 'high'));

ALTER TABLE opportunities DROP CONSTRAINT IF EXISTS opportunities_approved_risk_check;
ALTER TABLE opportunities ADD CONSTRAINT opportunities_approved_risk_check
  CHECK (approved_risk_level IS NULL OR approved_risk_level IN ('low', 'medium', 'high'));

ALTER TABLE opportunities DROP CONSTRAINT IF EXISTS opportunities_executed_via_check;
ALTER TABLE opportunities ADD CONSTRAINT opportunities_executed_via_check
  CHECK (executed_via IS NULL OR executed_via IN ('files', 'cms', 'manual'));

-- Vocabulaire fermé, vérifié par Postgres : la provenance reste légère, les
-- données de détection détaillées restent dans `details`.
ALTER TABLE opportunities DROP CONSTRAINT IF EXISTS opportunities_sources_check;
ALTER TABLE opportunities ADD CONSTRAINT opportunities_sources_check
  CHECK (sources <@ ARRAY['gsc','crawl','dataforseo','serp','cluster','backlinks','manual']::text[]);

-- `approved` s'insère entre planned et done.
ALTER TABLE opportunities DROP CONSTRAINT IF EXISTS opportunities_status_check;
ALTER TABLE opportunities ADD CONSTRAINT opportunities_status_check
  CHECK (status IN ('new','planned','approved','done','dismissed'));

CREATE INDEX IF NOT EXISTS idx_opportunities_risk ON opportunities(risk_level);

-- ─── 5. Branche de production ───────────────────────────────────────────────
-- scripts/publish-pages.ts pousse aujourd'hui sur la branche courante du dépôt,
-- quelle qu'elle soit. W0 a trouvé Site_Garage posé sur une branche de docs :
-- une publication à ce moment-là partait au mauvais endroit.

ALTER TABLE site_profiles
  ADD COLUMN IF NOT EXISTS production_branch text NOT NULL DEFAULT 'main';
