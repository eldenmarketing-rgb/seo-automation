-- ═══════════════════════════════════════════════════════════════════════════
-- gsc_page_daily — le trafic réel par page, sans le trou des requêtes anonymisées
-- ═══════════════════════════════════════════════════════════════════════════
-- `gsc_positions` collecte la vue « requête × page × date ». C'est la seule vue
-- qui permet de savoir SUR QUOI une page ranke — mais elle ment sur les totaux :
-- Google anonymise les requêtes rares, et les clics venant de ces requêtes
-- disparaissent dès qu'on demande la dimension `query`.
--
-- Mesuré sur garage-perpignan.fr, 2026-07-24 → 2026-08-20 :
--   API sans dimension  : 21 clics / 444 impressions   ← ce que montre l'UI
--   API dimension page  : 21 clics / 519 impressions
--   API dimension query :  1 clic  / 174 impressions   ← ce que la base collectait
--
-- 20 clics sur 21 étaient invisibles du système. Toutes les mesures d'impact,
-- tous les CTR par page et tous les totaux de portefeuille en dépendaient.
--
-- Cette table stocke la vue « page × date », qui elle est complète. Les deux
-- coexistent et ne se remplacent pas :
--   gsc_positions  → sur quelles requêtes une page apparaît (détail, incomplet)
--   gsc_page_daily → ce qu'une page rapporte réellement (total, complet)
--
-- Exécution :
--   env -u SUPABASE_ACCESS_TOKEN npx tsx scripts/run-migration.ts src/db/migration-gsc-page-daily.sql

CREATE TABLE IF NOT EXISTS gsc_page_daily (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_key    TEXT NOT NULL,
  page_url    TEXT NOT NULL,
  date        DATE NOT NULL,
  clicks      INT NOT NULL DEFAULT 0,
  impressions INT NOT NULL DEFAULT 0,
  ctr         REAL NOT NULL DEFAULT 0,
  position    REAL NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Un snapshot par page et par jour : le ré-import d'une période met à jour,
-- il ne duplique pas.
CREATE UNIQUE INDEX IF NOT EXISTS uq_gsc_page_daily
  ON gsc_page_daily(site_key, date, page_url);

CREATE INDEX IF NOT EXISTS idx_gsc_page_daily_site_date ON gsc_page_daily(site_key, date);
CREATE INDEX IF NOT EXISTS idx_gsc_page_daily_page ON gsc_page_daily(page_url);

-- Même règle que le reste du pilotage : la clé anon publique n'y touche pas.
ALTER TABLE gsc_page_daily ENABLE ROW LEVEL SECURITY;
