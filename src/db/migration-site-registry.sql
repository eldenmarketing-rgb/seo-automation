-- ═══════════════════════════════════════════════════════════════════════════
-- A1 — site_profiles devient la source unique de vérité du réseau
-- ═══════════════════════════════════════════════════════════════════════════
-- Avant : 5 listes de sites concurrentes (config/sites.ts, site-mode-registry.ts,
-- gsc-sites.ts, dashboard lib/sites.ts, SITE_DOMAINS inline) + site_profiles.
-- Après : site_profiles porte toute la config PAR SITE. Les règles génériques
-- LOCAL/THEMATIC/PRODUCT restent en TypeScript (config/mode-defaults.ts).
--
-- Exécution :
--   env -u SUPABASE_ACCESS_TOKEN npx tsx scripts/run-migration.ts src/db/migration-site-registry.sql
-- Puis seed (idempotent) :
--   npx tsx scripts/seed-site-registry.ts

-- ─── 1. Identité du site (ex-config/sites.ts) ───────────────────────────────
ALTER TABLE site_profiles
  ADD COLUMN IF NOT EXISTS is_active   boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS label       text,
  ADD COLUMN IF NOT EXISTS color       text,
  ADD COLUMN IF NOT EXISTS domain      text,
  ADD COLUMN IF NOT EXISTS gsc_domain  text,
  ADD COLUMN IF NOT EXISTS business    text,
  ADD COLUMN IF NOT EXISTS phone       text,
  ADD COLUMN IF NOT EXISTS email       text,
  ADD COLUMN IF NOT EXISTS address     text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS city        text,
  ADD COLUMN IF NOT EXISTS schema_type text;

-- ─── 2. Livraison technique (ex-config/sites.ts, complète delivery_mode) ────
ALTER TABLE site_profiles
  ADD COLUMN IF NOT EXISTS project_path       text,
  ADD COLUMN IF NOT EXISTS data_strategy      text,
  ADD COLUMN IF NOT EXISTS service_data_file  text,
  ADD COLUMN IF NOT EXISTS city_data_file     text,
  ADD COLUMN IF NOT EXISTS slug_page_file     text,
  ADD COLUMN IF NOT EXISTS vercel_hook_env    text,
  ADD COLUMN IF NOT EXISTS telegram_chat_env  text;

ALTER TABLE site_profiles DROP CONSTRAINT IF EXISTS site_profiles_data_strategy_check;
ALTER TABLE site_profiles ADD CONSTRAINT site_profiles_data_strategy_check
  CHECK (data_strategy IS NULL OR data_strategy IN ('data-files', 'config-only', 'create-dynamic'));

-- ─── 3. Génération : surcharges par site (ex-site-mode-registry.ts) ─────────
-- Les DÉFAUTS par mode restent en TypeScript. Ces colonnes ne portent que ce
-- qui est propre au site : sa voix de marque, ses services, ses topics.
ALTER TABLE site_profiles
  ADD COLUMN IF NOT EXISTS services              jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS seo_keyword_patterns  jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS brand                 jsonb,
  ADD COLUMN IF NOT EXISTS enabled_intents       text[],
  ADD COLUMN IF NOT EXISTS content_rules         jsonb,
  ADD COLUMN IF NOT EXISTS cocooning             jsonb,
  ADD COLUMN IF NOT EXISTS thematic              jsonb,
  ADD COLUMN IF NOT EXISTS product_config        jsonb;

CREATE INDEX IF NOT EXISTS idx_site_profiles_active ON site_profiles(is_active);

-- ─── 4. Sites manquants (insertion douce, jamais d'écrasement) ──────────────
-- okaz existait dans config/sites.ts, gsc-sites.ts et le dashboard, mais pas ici.
INSERT INTO site_profiles (site_key, name, scope, niche, mode)
VALUES ('okaz', 'Okaz Autos 66', 'local', 'Vente de voitures occasion — Saleilles & Perpignan', 'product')
ON CONFLICT (site_key) DO NOTHING;
