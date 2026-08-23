-- ─── Statut « external » ────────────────────────────────────────────────────
-- Une page peut exister en ligne sans que le CMS la rende. Sur carrossier-pro,
-- `app/[service]/page.tsx` cherche `siteConfig.services` (lib/config.ts) AVANT
-- `getCmsPage()` : trois slugs présents des deux côtés sont servis depuis le
-- fichier TypeScript, et la ligne Supabase est ignorée. Les éditer puis les
-- « publier » dans le dashboard n'avait aucun effet en ligne — et aucune
-- revalidation n'y changera rien, ce n'est pas un problème de cache.
--
-- `external` dit exactement ça : page connue, vivante, mais rendue par le code
-- du site. Le dashboard cesse de prétendre la piloter. Elle reste dans
-- l'inventaire (elle n'est pas `redirected`), donc le backlog SEO continue de
-- la voir. La migration vers le CMS se fera en A2/B1, contenu comparé.

ALTER TABLE seo_pages DROP CONSTRAINT IF EXISTS seo_pages_status_check;

ALTER TABLE seo_pages ADD CONSTRAINT seo_pages_status_check
  CHECK (status IN ('draft', 'published', 'optimized', 'error', 'redirected', 'brief_ready', 'external'));
