-- ═══════════════════════════════════════════════════════════════════════════
-- B2 — crawl_results : les faits par URL, et l'état réel du funnel d'indexation
-- ═══════════════════════════════════════════════════════════════════════════
-- Le système ne savait pas quelles pages sont indexées : les détecteurs du
-- backlog ne lisent que `gsc_positions`, qui ne contient que les pages ayant
-- DÉJÀ des impressions. Une page inconnue de Google était invisible du système
-- — c'est exactement le cas de carrosserie (7 impressions en août sur 13 pages
-- publiées).
--
-- Cette table stocke des FAITS, jamais un avis : ce que l'URL a répondu, ce que
-- le HTML servi contient, et ce que l'API GSC URL Inspection dit de son état
-- d'indexation. L'interprétation (quelle action lancer) appartient à B3/B4.
--
-- Une ligne par URL ET par passage : l'historique est ce qui rendra visible
-- « la page est passée de crawlée à indexée après l'action X ». Les lecteurs
-- passent par `v_crawl_latest`, jamais par la table brute.
--
-- Exécution :
--   env -u SUPABASE_ACCESS_TOKEN npx tsx scripts/run-migration.ts src/db/migration-crawl.sql

CREATE TABLE IF NOT EXISTS crawl_results (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id              UUID NOT NULL,
  site_key            TEXT NOT NULL,
  page_id             UUID REFERENCES seo_pages(id) ON DELETE SET NULL,
  url                 TEXT NOT NULL,
  slug                TEXT NOT NULL DEFAULT '',

  -- Ce qu'on ATTEND de cette URL. Une page redirigée n'est pas une page non
  -- indexée : elle a été supprimée exprès. Sans cette colonne, les 38 URL
  -- `redirected` du réseau pollueraient éternellement le diagnostic.
  expected_state      TEXT NOT NULL DEFAULT 'indexable'
                      CHECK (expected_state IN ('indexable', 'redirected', 'draft', 'out_of_scope')),

  -- ─── Faits HTTP ────────────────────────────────────────────────────────
  http_status         INT,
  final_url           TEXT,
  redirect_chain      JSONB NOT NULL DEFAULT '[]',
  response_ms         INT,

  -- ─── Faits HTML ────────────────────────────────────────────────────────
  indexable           BOOLEAN,
  robots_txt_allowed  BOOLEAN,
  meta_robots         TEXT,
  canonical           TEXT,
  title               TEXT,
  meta_description    TEXT,
  h1                  TEXT,
  h1_count            INT,
  h2_count            INT,
  structured_data     TEXT[] NOT NULL DEFAULT '{}',
  word_count          INT,
  content_hash        TEXT,
  links_out           INT,
  links_in            INT,
  click_depth         INT,
  in_sitemap          BOOLEAN,

  -- ─── Funnel GSC (API URL Inspection, service account) ───────────────────
  gsc_verdict            TEXT,
  gsc_coverage_state     TEXT,
  gsc_indexing_state     TEXT,
  gsc_page_fetch_state   TEXT,
  gsc_robots_state       TEXT,
  gsc_google_canonical   TEXT,
  gsc_last_crawl         TIMESTAMPTZ,
  gsc_inspected_at       TIMESTAMPTZ,

  -- ─── Synthèse ──────────────────────────────────────────────────────────
  -- DEPLOYED → HTTP_200 → INDEXABLE → IN_SITEMAP → INTERNALLY_LINKED
  --          → DISCOVERED → CRAWLED → INDEXED → RECEIVING_IMPRESSIONS
  funnel_stage        TEXT,
  issues              TEXT[] NOT NULL DEFAULT '{}',

  crawled_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crawl_site_date ON crawl_results(site_key, crawled_at DESC);
CREATE INDEX IF NOT EXISTS idx_crawl_site_url  ON crawl_results(site_key, url);
CREATE INDEX IF NOT EXISTS idx_crawl_run       ON crawl_results(run_id);
CREATE INDEX IF NOT EXISTS idx_crawl_page      ON crawl_results(page_id);

-- Dernier état connu de chaque URL — c'est cette vue que lisent le dashboard,
-- les détecteurs et les mesures.
CREATE OR REPLACE VIEW v_crawl_latest AS
SELECT DISTINCT ON (site_key, url) *
FROM crawl_results
ORDER BY site_key, url, crawled_at DESC;

-- La clé anon est embarquée dans le bundle public de carrossier-pro : elle ne
-- doit lire aucune donnée de pilotage (cf. migration-rls-fermeture.sql).
-- Aucune policy : le dashboard, les jobs et les scripts passent par la service
-- key, qui contourne la RLS.
ALTER TABLE crawl_results ENABLE ROW LEVEL SECURITY;
