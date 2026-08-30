-- ─── Redirections en base ──────────────────────────────────────────────────
-- Constat du 2026-08-30 : renommer une page publiée depuis le dashboard
-- laissait l'ancienne URL en 404 — le dashboard n'a pas la main sur le code
-- des sites, et les 301 vivaient uniquement dans next.config.
--
-- Une ligne `status = 'redirected'` porte désormais sa cible : `redirect_to`
-- (chemin absolu sur le site, « /prestations/x »). Les sites CMS la lisent
-- dans leur route fourre-tout, seulement quand aucune page publiée ne répond
-- (permanentRedirect, en cache par tag comme les pages). Les 301 déjà dans
-- next.config restent en place et passent avant.

ALTER TABLE seo_pages ADD COLUMN IF NOT EXISTS redirect_to TEXT;

COMMENT ON COLUMN seo_pages.redirect_to IS
  'Cible d''une ligne status = redirected (chemin absolu sur le site). Lue par les sites CMS via la clé anon.';

-- La clé anon voit le publié et les redirections (slug + cible) ; le reste
-- des colonnes d'une ligne redirigée est l'ancien contenu, non sensible.
DROP POLICY IF EXISTS "anon reads published pages" ON seo_pages;
CREATE POLICY "anon reads published pages" ON seo_pages
  FOR SELECT
  TO anon
  USING (status IN ('published', 'redirected'));
