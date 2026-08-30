-- ═══════════════════════════════════════════════════════════════════════════
-- Module Concurrents (2026-08-30) — les faits sur les concurrents d'un site
-- ═══════════════════════════════════════════════════════════════════════════
-- L'outil mesurait le réseau (GSC, crawl) sans jamais regarder les autres.
-- La preuve Carrosserie du 2026-08-28 a montré que la réponse à « pourquoi je
-- suis derrière » peut être l'inverse de l'intuition : nos pages étaient les
-- meilleures de la SERP, l'écart était les liens et l'entité locale.
--
-- Trois tables de FAITS, écrites par `src/jobs/competitors-scan.ts` :
--   competitors           ce que le user a déclaré, accepté ou ignoré
--   competitor_serp       la SERP brute de nos requêtes, un résultat par ligne
--   competitor_snapshots  un domaine (concurrent actif OU le nôtre) par passage
-- Le verdict et les actions se calculent côté dashboard (lib/competitors.ts,
-- lib/competitor-detectors.ts) — jamais ici.
--
-- 100 % ADDITIVE. Exécution :
--   env -u SUPABASE_ACCESS_TOKEN npx tsx scripts/run-migration.ts src/db/migration-competitors.sql

CREATE TABLE IF NOT EXISTS competitors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_key    TEXT NOT NULL,
  domain      TEXT NOT NULL,                       -- sans schéma ni www
  label       TEXT,
  kind        TEXT NOT NULL DEFAULT 'direct'
    CHECK (kind IN ('direct','annuaire','reseau')), -- annuaire/réseau national = hors verdict
  status      TEXT NOT NULL DEFAULT 'suggested'
    CHECK (status IN ('suggested','active','ignored')),
  origin      TEXT NOT NULL DEFAULT 'manual'
    CHECK (origin IN ('manual','serp')),
  serp_hits   INT NOT NULL DEFAULT 0,              -- requêtes du site où le domaine est en top 10
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (site_key, domain)
);
CREATE INDEX IF NOT EXISTS idx_competitors_site ON competitors(site_key, status);

CREATE TABLE IF NOT EXISTS competitor_serp (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        UUID NOT NULL,
  site_key      TEXT NOT NULL,
  query         TEXT NOT NULL,
  query_source  TEXT NOT NULL DEFAULT 'gsc'
    CHECK (query_source IN ('gsc','cluster','service')),
  impressions   INT NOT NULL DEFAULT 0,            -- GSC 28 j de la requête (0 = inconnue de GSC)
  position      INT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('organic','local_pack')),
  domain        TEXT NOT NULL,
  url           TEXT NOT NULL DEFAULT '',
  title         TEXT NOT NULL DEFAULT '',
  rating        REAL,                              -- pack local : note
  votes         INT,                               -- pack local : nombre d'avis
  is_ours       BOOLEAN NOT NULL DEFAULT false,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_competitor_serp_site ON competitor_serp(site_key, fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_competitor_serp_run  ON competitor_serp(run_id);

CREATE TABLE IF NOT EXISTS competitor_snapshots (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id                   UUID NOT NULL,
  site_key                 TEXT NOT NULL,
  domain                   TEXT NOT NULL,
  is_self                  BOOLEAN NOT NULL DEFAULT false,
  sitemap_reached          BOOLEAN NOT NULL DEFAULT false,
  sitemap_urls             TEXT[] NOT NULL DEFAULT '{}',
  new_urls                 TEXT[] NOT NULL DEFAULT '{}',   -- absentes du snapshot précédent du domaine
  referring_domains        INT,                            -- DataForSEO summary
  referring_domains_clean  INT,                            -- hors spam-pbn / social, rang > 0
  backlink_rank            INT,
  domain_first_seen        DATE,
  referring                JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{domain, rank, backlinks, first_seen, category}]
  page_facts               JSONB NOT NULL DEFAULT '{}'::jsonb,  -- {url: {status, words, h1, h2_count, faq_count, schema_types}}
  serp_top10               INT NOT NULL DEFAULT 0,
  serp_avg_pos             REAL,
  pack_hits                INT NOT NULL DEFAULT 0,
  rating                   REAL,
  votes                    INT,
  fetched_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_competitor_snapshots_site ON competitor_snapshots(site_key, domain, fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_competitor_snapshots_run  ON competitor_snapshots(run_id);

-- Dernier passage par site (même règle que v_crawl_latest : ce que le dernier
-- run a vu, pas le dernier état connu de chaque ligne).
CREATE OR REPLACE VIEW v_competitor_serp_latest AS
WITH dernier_run AS (
  SELECT DISTINCT ON (site_key) site_key, run_id
  FROM competitor_serp
  ORDER BY site_key, fetched_at DESC
)
SELECT s.*
FROM competitor_serp s
JOIN dernier_run d ON d.site_key = s.site_key AND d.run_id = s.run_id;

CREATE OR REPLACE VIEW v_competitor_snapshots_latest AS
WITH dernier_run AS (
  SELECT DISTINCT ON (site_key) site_key, run_id
  FROM competitor_snapshots
  ORDER BY site_key, fetched_at DESC
)
SELECT s.*
FROM competitor_snapshots s
JOIN dernier_run d ON d.site_key = s.site_key AND d.run_id = s.run_id;

-- Lecture par la clé service uniquement (dashboard, jobs) — pas de policy anon.
ALTER TABLE competitors          ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_serp      ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_snapshots ENABLE ROW LEVEL SECURITY;

-- Les actions du détecteur Concurrents portent la source 'competitors'
-- (runScan purge les actions « new » avant d'écrire : une contrainte qui refuse
-- la valeur vide le backlog au lieu d'ajouter des lignes — constaté le 2026-08-30).
ALTER TABLE opportunities DROP CONSTRAINT IF EXISTS opportunities_sources_check;
ALTER TABLE opportunities ADD CONSTRAINT opportunities_sources_check
  CHECK (sources <@ ARRAY['gsc','crawl','dataforseo','serp','cluster','backlinks','manual','keywords','competitors']::text[]);
