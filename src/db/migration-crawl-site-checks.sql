-- ═══════════════════════════════════════════════════════════════════════════
-- crawl_site_checks : ce que le SITE déclare à Google — robots.txt et sitemap
-- ═══════════════════════════════════════════════════════════════════════════
-- `crawl_results` porte des faits par URL. Deux faits n'appartiennent à aucune
-- URL : « le robots.txt répond-il ? » et « le sitemap est-il joignable, que
-- déclare-t-il ? ». Le crawler les connaissait déjà mais ne les écrivait qu'à
-- l'écran du terminal — un robots.txt disparu lors d'une bascule CMS (constat
-- du pilote Carrosserie-pro, 2026-08-21) ne laissait aucune trace en base :
-- un robots absent autorise tout, donc aucune anomalie par URL ne le signale.
--
-- Une ligne par site et par passage, comme `crawl_results`. Le dashboard lit
-- `v_crawl_site_checks_latest` (dernier passage de chaque site).
--
-- Exécution :
--   env -u SUPABASE_ACCESS_TOKEN npx tsx scripts/run-migration.ts src/db/migration-crawl-site-checks.sql

CREATE TABLE IF NOT EXISTS crawl_site_checks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id            UUID NOT NULL,
  site_key          TEXT NOT NULL,

  -- ─── robots.txt ────────────────────────────────────────────────────────
  robots_status     INT,                              -- HTTP de /robots.txt (0 = injoignable)
  robots_fetched    BOOLEAN NOT NULL DEFAULT false,   -- répond 200
  robots_group      TEXT,                             -- groupe retenu : 'googlebot', '*' ou NULL
  robots_rules      INT NOT NULL DEFAULT 0,           -- règles Allow/Disallow du groupe retenu
  robots_sitemaps   TEXT[] NOT NULL DEFAULT '{}',     -- lignes « Sitemap: »
  robots_body       TEXT,                             -- le fichier tel que servi (tronqué à 4 Ko)

  -- ─── sitemap ───────────────────────────────────────────────────────────
  sitemap_status    INT,                              -- HTTP de /sitemap.xml
  sitemap_reached   BOOLEAN NOT NULL DEFAULT false,   -- au moins un sitemap a répondu 200
  sitemap_sources   TEXT[] NOT NULL DEFAULT '{}',     -- fichiers sitemap lus (index compris)
  sitemap_urls      TEXT[] NOT NULL DEFAULT '{}',     -- <loc> déclarées, dédoublonnées

  crawled_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crawl_site_checks_site ON crawl_site_checks(site_key, crawled_at DESC);
CREATE INDEX IF NOT EXISTS idx_crawl_site_checks_run  ON crawl_site_checks(run_id);

CREATE OR REPLACE VIEW v_crawl_site_checks_latest AS
SELECT DISTINCT ON (site_key) *
FROM crawl_site_checks
ORDER BY site_key, crawled_at DESC;

-- Même règle que crawl_results : aucune policy, la clé anon ne voit rien.
ALTER TABLE crawl_site_checks ENABLE ROW LEVEL SECURITY;
