-- Types de page réels (2026-08-28).
--
-- La contrainte n'admettait que service / city / city_service : l'import par
-- sitemap rangeait donc un hub de blog, une catégorie, un article ou une fiche
-- véhicule en « service », et le brief leur imposait le plan d'une page
-- prestation (CTA devis, 800 mots, FAQ). Le type pilote maintenant le brief,
-- la génération et le profil de score.
ALTER TABLE seo_pages DROP CONSTRAINT IF EXISTS seo_pages_page_type_check;
ALTER TABLE seo_pages ADD CONSTRAINT seo_pages_page_type_check CHECK (
  page_type IN ('service', 'city', 'city_service', 'hub', 'category', 'article', 'product', 'home', 'utility')
);
