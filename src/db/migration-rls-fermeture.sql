-- ═══════════════════════════════════════════════════════════════════════════
-- Fermeture RLS — la clé anon ne doit lire que ce qui est déjà public
-- ═══════════════════════════════════════════════════════════════════════════
-- Découvert en vérifiant la RLS de seo_page_revisions (A3) : la clé anon
-- embarquée dans le bundle JS public de carrossier-pro.fr lisait, en plus des
-- pages publiées, l'intégralité du pilotage du réseau.
--
-- Constaté le 2026-08-23 avec la clé de production du site :
--   site_profiles       12 lignes  — dont revalidate_secret de carrosserie EN CLAIR
--   opportunities       89 lignes  — tout le backlog d'actions
--   gsc_positions   12 798 lignes  — tout l'historique Search Console
--   discovered_keywords 25 390 lignes
--   keyword_clusters    96 · backlink_targets 109 · backlink_tasks 217
--   automation_logs    834 · optimization_queue 125 · dataforseo_cache
--
-- Le secret de revalidation permet de déclencher des revalidations arbitraires
-- sur carrossier-pro.fr. Le reste est la stratégie SEO complète du réseau.
--
-- Seul Carrosserie-pro consomme cette clé, et uniquement pour `seo_pages`
-- (lib/cms.ts : from("seo_pages")). Luvala utilise un autre projet Supabase.
-- Le dashboard, le bot, les jobs et les scripts passent par la service key, qui
-- contourne la RLS : activer la RLS sans policy ne casse aucun d'entre eux.
--
-- On NE touche pas seo_pages ni page_images : migration-cms.sql leur a donné
-- des policies anon volontaires (pages publiées + images), dont le site vit.
--
-- Exécution :
--   env -u SUPABASE_ACCESS_TOKEN npx tsx scripts/run-migration.ts src/db/migration-rls-fermeture.sql

ALTER TABLE site_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities       ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_measurements    ENABLE ROW LEVEL SECURITY;
ALTER TABLE gsc_positions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovered_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_clusters    ENABLE ROW LEVEL SECURITY;
ALTER TABLE backlink_targets    ENABLE ROW LEVEL SECURITY;
ALTER TABLE backlink_tasks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimization_queue  ENABLE ROW LEVEL SECURITY;
ALTER TABLE dataforseo_cache    ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_settings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_articles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items          ENABLE ROW LEVEL SECURITY;

-- ⚠ Le secret de revalidation de carrosserie a été exposé publiquement : il est
-- à considérer comme compromis et doit être tourné (dashboard /sites + variable
-- REVALIDATE_SECRET du projet Vercel). Aucune rotation automatique ici : elle
-- doit être simultanée des deux côtés, sinon la publication CMS casse.
