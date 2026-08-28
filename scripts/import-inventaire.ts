/**
 * Import de l'inventaire réel des sites dans `seo_pages`.
 *
 * `seo_pages` n'a jamais été un inventaire : c'est le journal de ce que le
 * générateur a produit. Les sites construits en session CLI (debarras,
 * silent-party, elayarituel…) ont été écrits directement dans leur dépôt, puis
 * poussés — la base n'en a jamais rien su. Résultat : le backlog raisonne sur
 * un inventaire fictif et les mesures d'impact n'ont pas de dénominateur.
 *
 * Ce script comble le trou dans **un seul sens : la réalité → la base**.
 *  - la découverte passe par le sitemap du site en ligne, pas par un parseur
 *    par dépôt (c'est ce couplage qui a rendu `import-site-pages.ts`
 *    utilisable pour Carrosserie-pro seulement) ;
 *  - une URL qui ne répond pas 200 n'est jamais importée — sinon on recrée à
 *    l'échelle du réseau le mensonge de la page debarras marquée publiée alors
 *    qu'elle rendait un 404 ;
 *  - les pages importées entrent en `status = 'external'` : elles existent et
 *    rankent, mais c'est le code du site qui les rend, pas le CMS. Les mettre
 *    en `published` laisserait croire que « Publier » agit dessus ;
 *  - aucune ligne existante n'est modifiée, jamais. Un slug déjà connu est
 *    laissé tel quel, quel que soit son statut.
 *
 * Usage :
 *   npx tsx scripts/import-inventaire.ts                 # simulation (défaut)
 *   npx tsx scripts/import-inventaire.ts --site=debarras
 *   npx tsx scripts/import-inventaire.ts --apply         # écrit en base
 *
 * L'écriture est volontairement derrière `--apply` et non derrière l'habituel
 * `--dry-run` : l'import touche ~100 lignes sur une dizaine de sites, le défaut
 * doit être celui qui ne peut rien casser.
 */

import { getSupabase } from '../src/db/supabase.js';
import { cities66 } from '../config/cities-66.js';
import { OUT_OF_SCOPE_SLUGS } from '../src/crawler/scope.js';

const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith('--site='))?.split('=')[1];
const apply = args.includes('--apply');

const CITY_SLUGS = new Set(cities66.map((c) => c.slug));

/**
 * Pages sans intérêt SEO : elles encombreraient l'inventaire et le backlog
 * proposerait un jour de les optimiser. Liste partagée avec le crawler B2
 * (`src/crawler/scope.ts`), qui l'utilise pour ne pas les juger ni consommer
 * du quota d'inspection dessus.
 */
const IGNORED = OUT_OF_SCOPE_SLUGS;

interface Discovered {
  slug: string;
  url: string;
}

interface PageFacts {
  h1: string;
  title: string;
  description: string;
  wordCount: number;
  internalLinks: number;
}

// ─── Lecture du HTML servi ──────────────────────────────────────────────────
// Duplique volontairement la logique du dashboard (`lib/publish.ts`) : les deux
// dépôts ont leur propre `node_modules` et un import croisé casserait au
// premier `npm ci`.

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity.startsWith('#')) {
      const code =
        entity[1] === 'x' || entity[1] === 'X'
          ? Number.parseInt(entity.slice(2), 16)
          : Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : match;
    }
    return ENTITIES[entity.toLowerCase()] ?? match;
  });
}

function normalizeText(text: string): string {
  return decodeEntities(text.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function first(html: string, re: RegExp): string {
  const m = html.match(re);
  return m ? normalizeText(m[1]) : '';
}

function readPage(html: string, host: string): PageFacts {
  // Le texte visible, sans <script>/<style>/<nav>/<footer> : sert seulement à
  // donner un ordre de grandeur du volume rédactionnel.
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ');

  // Liens comptés sur le corps seulement : ceux de la nav et du pied de page
  // sont identiques partout et ne disent rien du maillage de la page.
  const links = [...body.matchAll(/<a\b[^>]*href="([^"]+)"/gi)]
    .map((m) => m[1])
    .filter((href) => href.startsWith('/') || href.includes(host));

  return {
    h1: first(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i),
    title: first(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
    description: first(html, /<meta[^>]+name="description"[^>]+content="([^"]*)"/i),
    wordCount: normalizeText(body).split(' ').filter(Boolean).length,
    internalLinks: new Set(links).size,
  };
}

// ─── Découverte via le sitemap ──────────────────────────────────────────────

async function fetchText(url: string): Promise<{ status: number; body: string }> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'seo-automation/import-inventaire', 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(20_000),
    });
    return { status: res.status, body: res.ok ? await res.text() : '' };
  } catch {
    return { status: 0, body: '' };
  }
}

function locsOf(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
}

/** Les URL du sitemap, index de sitemaps compris (un seul niveau d'imbrication). */
async function discover(domain: string): Promise<{ pages: Discovered[]; error?: string }> {
  const base = domain.replace(/\/$/, '');
  const { status, body } = await fetchText(`${base}/sitemap.xml`);
  if (status !== 200) return { pages: [], error: `sitemap.xml → ${status || 'injoignable'}` };

  let urls = locsOf(body);
  if (/<sitemapindex/i.test(body)) {
    const nested: string[] = [];
    for (const child of urls) {
      const sub = await fetchText(child);
      if (sub.status === 200) nested.push(...locsOf(sub.body));
    }
    urls = nested;
  }

  const seen = new Set<string>();
  const pages: Discovered[] = [];
  for (const url of urls) {
    let slug: string;
    try {
      slug = new URL(url).pathname.replace(/^\//, '').replace(/\/$/, '');
    } catch {
      continue;
    }
    if (IGNORED.some((re) => re.test(slug))) continue;
    if (seen.has(slug)) continue;
    seen.add(slug);
    pages.push({ slug, url });
  }
  return { pages };
}

/**
 * `page_type` est NOT NULL et contraint à city / service / city_service.
 * L'inventaire ne sait pas ce qu'est une page : on déduit du slug, et la vérité
 * brute (l'URL) reste dans `content.imported` pour pouvoir corriger plus tard.
 */
// Mêmes règles que `src/lib/page-types.ts` du dashboard (deducePageType) — à
// tenir à jour ensemble. Un hub de blog, une catégorie, un article ou une fiche
// produit rangés en « service » recevaient le brief d'une page prestation.
const BLOG_ROOTS = new Set(['blog', 'actualites', 'actualite', 'conseils', 'guides', 'guide', 'magazine', 'articles', 'news']);
const BLOG_LISTS = new Set(['categorie', 'category', 'categories', 'tag', 'tags', 'auteur', 'author', 'page']);
const SHOP_ROOTS = new Set(['vehicules', 'vehicule', 'voitures', 'voiture', 'produit', 'produits', 'catalogue', 'boutique', 'shop', 'occasions', 'stock']);
const LIST_ROOTS = new Set(['categorie', 'category', 'categories', 'collections', 'collection', 'marques', 'marque']);
const UTILITY = new Set(['contact', 'mentions-legales', 'mentions', 'cgv', 'cgu', 'politique-de-confidentialite', 'confidentialite', 'cookies', 'plan-du-site', 'sitemap', 'a-propos', 'apropos', 'qui-sommes-nous', 'equipe', 'recrutement', 'devis', 'merci', 'thank-you', '404', 'login', 'compte']);

type PageType = 'city' | 'service' | 'city_service' | 'hub' | 'category' | 'article' | 'product' | 'home' | 'utility';

function guessType(slug: string): PageType {
  const segments = slug.split('/').filter(Boolean);
  if (segments.length === 0) return 'home';
  const first = segments[0];
  const last = segments[segments.length - 1];
  if (UTILITY.has(last)) return 'utility';
  if (BLOG_ROOTS.has(first)) {
    if (segments.length === 1) return 'hub';
    return BLOG_LISTS.has(segments[1]) ? 'category' : 'article';
  }
  if (SHOP_ROOTS.has(first)) return segments.length === 1 ? 'category' : 'product';
  if (LIST_ROOTS.has(first)) return 'category';
  if (CITY_SLUGS.has(last)) return segments.length > 1 ? 'city_service' : 'city';
  // « debosselage-perpignan » : ville en suffixe du dernier segment
  const suffix = [...CITY_SLUGS].find((c) => last.endsWith(`-${c}`));
  return suffix ? 'city_service' : 'service';
}

// ─── Import ─────────────────────────────────────────────────────────────────

interface SiteRow {
  site_key: string;
  domain: string | null;
  is_active: boolean;
}

async function main() {
  const db = getSupabase();

  const { data: sites, error: sitesErr } = await db
    .from('site_profiles')
    .select('site_key, domain, is_active')
    .order('site_key');
  if (sitesErr) throw new Error(`Registre des sites : ${sitesErr.message}`);

  const targets = (sites as SiteRow[]).filter(
    (s) => s.domain && (!only || s.site_key === only) && (only ? true : s.is_active)
  );
  if (targets.length === 0) {
    console.log(only ? `Aucun site « ${only} » avec un domaine.` : 'Aucun site actif avec un domaine.');
    return;
  }

  console.log(apply ? '\n=== IMPORT (écriture en base) ===\n' : '\n=== SIMULATION (--apply pour écrire) ===\n');

  let totalNew = 0;
  let totalKnown = 0;
  let totalSkipped = 0;

  for (const site of targets) {
    const domain = site.domain!.replace(/\/$/, '');
    const host = new URL(domain).host;

    const { data: rows, error: rowsErr } = await db
      .from('seo_pages')
      .select('slug, status')
      .eq('site_key', site.site_key);
    if (rowsErr) throw new Error(`Pages de ${site.site_key} : ${rowsErr.message}`);
    const known = new Map((rows || []).map((r) => [r.slug as string, r.status as string]));

    const { pages, error } = await discover(domain);
    if (error) {
      console.log(`${site.site_key.padEnd(14)} ⚠  ${error}`);
      continue;
    }

    const missing = pages.filter((p) => !known.has(p.slug));
    const imported: string[] = [];
    const skipped: string[] = [];

    for (const page of missing) {
      const { status, body } = await fetchText(page.url);
      if (status !== 200) {
        // Anti-mensonge : une URL qui ne répond pas n'entre pas à l'inventaire.
        skipped.push(`${page.slug || '(accueil)'} → HTTP ${status || 'injoignable'}`);
        continue;
      }

      const facts = readPage(body, host);
      const row = {
        site_key: site.site_key,
        slug: page.slug,
        page_type: guessType(page.slug),
        // NOT NULL en base : on écrit ce que la page sert, jamais une invention.
        h1: facts.h1,
        meta_title: facts.title,
        meta_description: facts.description,
        content: {
          imported: {
            source: 'import-inventaire',
            url: page.url,
            at: new Date().toISOString(),
            wordCount: facts.wordCount,
            internalLinks: facts.internalLinks,
          },
        },
        // La page est rendue par le code du site, pas par le CMS.
        status: 'external',
        deployed_at: new Date().toISOString(),
      };

      if (apply) {
        const { data: inserted, error: insErr } = await db
          .from('seo_pages')
          .insert(row)
          .select('id')
          .single();
        if (insErr) throw new Error(`Import ${site.site_key}/${page.slug} : ${insErr.message}`);

        // Le trigger d'historique a créé la révision v1 sans motif : on
        // l'étiquette pour que l'historique reste lisible.
        await db
          .from('seo_page_revisions')
          .update({ change_reason: 'import inventaire', change_author: 'import-inventaire' })
          .eq('page_id', inserted.id)
          .is('change_reason', null);
      }

      imported.push(
        `${(page.slug || '(accueil)').padEnd(46)} ${String(facts.wordCount).padStart(5)} mots  ${String(
          facts.internalLinks
        ).padStart(3)} liens  ${facts.h1.slice(0, 42)}`
      );
    }

    totalNew += imported.length;
    totalKnown += pages.length - missing.length;
    totalSkipped += skipped.length;

    console.log(
      `${site.site_key.padEnd(14)} ${String(pages.length).padStart(3)} URL au sitemap · ` +
        `${String(pages.length - missing.length).padStart(3)} déjà en base · ` +
        `${String(imported.length).padStart(3)} à importer` +
        (skipped.length ? ` · ${skipped.length} écartée(s)` : '')
    );
    for (const line of imported) console.log(`   + ${line}`);
    for (const line of skipped) console.log(`   ✗ ${line}`);
    if (imported.length || skipped.length) console.log('');
  }

  console.log(
    `\n${totalNew} page(s) ${apply ? 'importée(s)' : 'à importer'} · ` +
      `${totalKnown} déjà connue(s) · ${totalSkipped} écartée(s) faute de 200.\n`
  );
  if (!apply && totalNew > 0) console.log('Relancer avec --apply pour écrire en base.\n');
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
