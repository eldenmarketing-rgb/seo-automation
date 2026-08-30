/**
 * Rattrapage du 2026-08-30 : pose `parent_id` sur les pages existantes.
 *
 * Règles, dans l'ordre :
 *  1. Les hubs de prestations (`prestations`, `services`) étaient typés
 *     « service » : on les passe en `hub` (même règle que deducePageType).
 *  2. Une page à segments (`prestations/x`, `blog/x`, `guides/x`) se rattache à
 *     la page dont le slug est son répertoire, si celle-ci est un parent
 *     (home/hub/category). `categorie/x` → parent = `categorie` s'il existe.
 *  3. Une page service / city_service / city à la racine se rattache à
 *     l'accueil du site ; hubs et catégories aussi.
 *  4. Le reste (produits sans catégorie connue, utilitaires) reste sans parent.
 *
 * Simulation par défaut ; `--apply` écrit.
 */
import { getSupabase } from '../../src/db/client.js';

const apply = process.argv.includes('--apply');
const sb = getSupabase();

const PARENT_TYPES = new Set(['home', 'hub', 'category']);
const HUB_SLUGS = new Set(['prestations', 'services', 'nos-services', 'nos-prestations']);

interface Row {
  id: string;
  site_key: string;
  slug: string;
  page_type: string;
  status: string;
  parent_id: string | null;
}

const { data, error } = await sb
  .from('seo_pages')
  .select('id, site_key, slug, page_type, status, parent_id')
  .neq('status', 'redirected')
  .order('site_key')
  .order('slug');
if (error) throw error;
const rows = data as Row[];

// 1. Retypage des hubs de prestations
const retype = rows.filter((r) => HUB_SLUGS.has(r.slug) && r.page_type !== 'hub');
for (const r of retype) {
  console.log(`retype  ${r.site_key.padEnd(12)} /${r.slug.padEnd(28)} ${r.page_type} → hub`);
  r.page_type = 'hub';
  if (apply) await sb.from('seo_pages').update({ page_type: 'hub' }).eq('id', r.id);
}

// 2-3. Rattachement
const bySite = new Map<string, Row[]>();
for (const r of rows) bySite.set(r.site_key, [...(bySite.get(r.site_key) ?? []), r]);

let n = 0;
let skipped = 0;
for (const [site, pages] of bySite) {
  const parents = pages.filter((p) => PARENT_TYPES.has(p.page_type));
  const bySlug = new Map(parents.map((p) => [p.slug, p]));
  const home = parents.find((p) => p.page_type === 'home') ?? null;
  // Le hub des prestations liste les services même quand ils vivent à la racine (garage, VTC).
  const servicesHub = parents.find((p) => p.page_type === 'hub' && HUB_SLUGS.has(p.slug)) ?? null;

  for (const p of pages) {
    if (p.parent_id || p.page_type === 'home') continue;
    let parent: Row | null = null;
    const i = p.slug.lastIndexOf('/');
    if (i !== -1) {
      // Le répertoire le plus long qui est un parent connu : blog/categorie/x → blog/categorie, sinon blog.
      let dir = p.slug.slice(0, i);
      while (dir && !parent) {
        parent = bySlug.get(dir) ?? null;
        const j = dir.lastIndexOf('/');
        dir = j === -1 ? '' : dir.slice(0, j);
      }
      if (!parent && (p.page_type === 'product' || p.page_type === 'article')) {
        skipped++;
        console.log(`skip    ${site.padEnd(12)} /${p.slug} (${p.page_type}, répertoire sans parent connu)`);
        continue;
      }
    }
    if (!parent && ['service', 'city_service', 'city'].includes(p.page_type)) parent = servicesHub ?? home;
    if (!parent && ['hub', 'category'].includes(p.page_type)) parent = home;
    if (!parent || parent.id === p.id) {
      skipped++;
      continue;
    }
    n++;
    console.log(
      `attach  ${site.padEnd(12)} /${p.slug.padEnd(44)} → /${parent.slug || '(accueil)'} [${parent.page_type}]`,
    );
    if (apply) await sb.from('seo_pages').update({ parent_id: parent.id }).eq('id', p.id);
  }
}
console.log(`\n${retype.length} retypage(s), ${n} rattachement(s), ${skipped} sans parent — ${apply ? 'ÉCRIT' : 'simulation (--apply pour écrire)'}`);
