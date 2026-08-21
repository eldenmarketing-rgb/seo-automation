-- Migration : backlog d'actions SEO + mesures d'impact (Phase 2 pilotage)
-- 100% ADDITIVE — aucune suppression, aucune modification destructive.
--
-- 1. `opportunities` (table vide héritée du design auto-generate) devient le
--    backlog d'actions SEO multi-types. Les colonnes legacy (generated_content,
--    html_content, …) sont conservées mais inutilisées.
-- 2. `seo_measurements` : série temporelle baseline / J+7 / J+28 / J+60 / J+90
--    par action, calculée depuis gsc_positions.
-- 3. `site_profiles.mode` : local / thematic / product — source de vérité
--    pilotage (le registry config/site-mode-registry.ts reste dédié à la génération).
--
-- Exécution : env -u SUPABASE_ACCESS_TOKEN npx tsx scripts/run-migration.ts src/db/migration-seo-backlog.sql

-- ─── 1. opportunities → backlog d'actions SEO ───────────────────────────────

ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS action_type text NOT NULL DEFAULT 'OPTIMIZE_PAGE',
  ADD COLUMN IF NOT EXISTS page_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS mode text,
  ADD COLUMN IF NOT EXISTS impact real DEFAULT 0,
  ADD COLUMN IF NOT EXISTS effort real DEFAULT 1,
  ADD COLUMN IF NOT EXISTS confidence real DEFAULT 0,
  ADD COLUMN IF NOT EXISTS priority real DEFAULT 0,
  ADD COLUMN IF NOT EXISTS justification text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS details jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS prev_clicks integer,
  ADD COLUMN IF NOT EXISTS prev_impressions integer,
  ADD COLUMN IF NOT EXISTS prev_position real,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Statuts backlog : new / planned / done / dismissed (l'ancien défaut était 'pending')
ALTER TABLE opportunities ALTER COLUMN status SET DEFAULT 'new';
ALTER TABLE opportunities DROP CONSTRAINT IF EXISTS opportunities_status_check;
ALTER TABLE opportunities ADD CONSTRAINT opportunities_status_check CHECK (status IN ('new','planned','done','dismissed'));

ALTER TABLE opportunities DROP CONSTRAINT IF EXISTS opportunities_action_type_check;
ALTER TABLE opportunities ADD CONSTRAINT opportunities_action_type_check CHECK (action_type IN (
  'CREATE_PAGE','OPTIMIZE_PAGE','UPDATE_CONTENT','MERGE_CONTENT','REDIRECT',
  'FIX_INDEXATION','FIX_CANNIBALIZATION','INTERNAL_LINKING','TECHNICAL_SEO',
  'GBP_OPTIMIZATION','LOCAL_CITATION','BACKLINK','SERP_ANALYSIS','CLUSTER_BUILDING','NO_ACTION'
));

-- Contraintes legacy retirées (table vide — aucune donnée perdue) :
-- (site_id, query) unique empêcherait plusieurs actions sur une même requête ;
-- la FK vers la table `sites` (1 ligne, vestige) bloquerait tous les site_key réels
ALTER TABLE opportunities DROP CONSTRAINT IF EXISTS opportunities_site_id_query_key;
ALTER TABLE opportunities DROP CONSTRAINT IF EXISTS opportunities_site_id_fkey;

-- Dédoublonnage des détections : une action par (site, type, requête, page, source)
CREATE UNIQUE INDEX IF NOT EXISTS uq_opportunities_action
  ON opportunities(site_id, action_type, query, page_url, source);

CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_site ON opportunities(site_id);

-- ─── 2. seo_measurements : mesures d'impact par action ──────────────────────

CREATE TABLE IF NOT EXISTS seo_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_key text NOT NULL,
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE CASCADE,
  page_url text NOT NULL DEFAULT '',
  query text NOT NULL DEFAULT '',
  checkpoint text NOT NULL CHECK (checkpoint IN ('baseline','j7','j28','j60','j90')),
  clicks integer DEFAULT 0,
  impressions integer DEFAULT 0,
  ctr real DEFAULT 0,
  position real,
  queries_count integer DEFAULT 0,
  window_start date,
  window_end date,
  measured_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_seo_measurements_checkpoint
  ON seo_measurements(opportunity_id, checkpoint) WHERE opportunity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_seo_measurements_site ON seo_measurements(site_key);

-- ─── 3. site_profiles.mode ──────────────────────────────────────────────────

ALTER TABLE site_profiles ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'local';
ALTER TABLE site_profiles DROP CONSTRAINT IF EXISTS site_profiles_mode_check;
ALTER TABLE site_profiles ADD CONSTRAINT site_profiles_mode_check CHECK (mode IN ('local','thematic','product'));

UPDATE site_profiles SET mode = 'thematic' WHERE site_key IN ('silent-party','retraite','reprog');
UPDATE site_profiles SET mode = 'product' WHERE site_key IN ('voitures','okaz');

-- Profils manquants pour les sites déjà suivis en GSC (insertion douce, jamais d'écrasement)
INSERT INTO site_profiles (site_key, name, scope, niche, mode)
VALUES
  ('debarras', 'Debarras Habitat', 'local', 'Débarras maison, cave, succession — Perpignan', 'local'),
  ('elayarituel', 'Elaya Rituel', 'local', 'Massage et drainage lymphatique à domicile — Perpignan', 'local')
ON CONFLICT (site_key) DO NOTHING;
