/**
 * Import des pages d'un site dans Supabase, qui devient la source de vérité.
 *
 * Les fichiers du repo font foi : ce qui est en ligne aujourd'hui doit être
 * exactement ce qu'on retrouve en base après import, pour que la bascule en
 * mode CMS ne change rien de visible.
 *
 * Usage :
 *   npx tsx scripts/import-site-pages.ts --site=carrosserie [--dry-run]
 */

import { existsSync } from 'fs';
import { getSupabase } from '../../src/db/supabase.js';

interface ImportedPage {
  slug: string;
  page_type: string;
  city: string | null;
  service: string | null;
  meta_title: string;
  meta_description: string;
  h1: string;
  content: Record<string, unknown>;
}

const args = process.argv.slice(2);
const siteArg = args.find((a) => a.startsWith('--site='));
const dryRun = args.includes('--dry-run');
const siteKey = siteArg?.split('=')[1];

if (!siteKey) {
  console.error('Usage : npx tsx scripts/import-site-pages.ts --site=<key> [--dry-run]');
  process.exit(1);
}

/** Libellé d'ancre à partir d'une URL interne — reprend la logique du template. */
function anchorFromHref(href: string): string {
  return href
    .replace(/^\//, '')
    .replace(/\/perpignan$/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Dimensions réelles de l'image : sans elles, le navigateur ne peut pas réserver l'espace (CLS). */
async function imageMeta(publicPath: string, projectPath: string) {
  const file = `${projectPath}/public${publicPath}`;
  if (!existsSync(file)) return null;
  try {
    // `sharp` a quitté les dépendances du dépôt (ménage 2026-08-28) : sans lui,
    // pas de dimensions — acceptable pour un site qui rend ses images en `fill`.
    const sharp = (await import('sharp').catch(() => null))?.default;
    if (!sharp) return null;
    const { width, height } = await sharp(file).metadata();
    return { width, height };
  } catch {
    return null;
  }
}

// ─── Carrosserie-pro ────────────────────────────────────────────────────

async function importCarrosserie(): Promise<ImportedPage[]> {
  const projectPath = '/home/ubuntu/sites/Carrosserie-pro';
  const mod = await import(`${projectPath}/data/service-pages.ts`);
  const servicePages = mod.servicePages as Array<{
    service: string;
    ville: string;
    keyword: string;
    metaTitle: string;
    metaDescription: string;
    h1: string;
    heroSubtitle: string;
    sections: Record<string, { title: string; content: string }>;
    faq: Array<{ question: string; answer: string }>;
    relatedServices: string[];
  }>;

  const pages: ImportedPage[] = [];

  for (const p of servicePages) {
    const slug = `${p.service}/${p.ville}`;

    // Les 4 sections figées du template deviennent une liste ordonnée,
    // désormais modifiable depuis le dashboard.
    const seoSections = ['probleme', 'services', 'prix', 'process']
      .map((k) => p.sections[k])
      .filter(Boolean)
      .map((s) => ({ title: s.title, content: s.content }));

    // Convention de nommage du template : /images/services/<service>-<ville>.webp
    const imgPath = `/images/services/${p.service}-${p.ville}.webp`;
    const meta = await imageMeta(imgPath, projectPath);
    const heroImage = meta
      ? {
          src: imgPath,
          alt: `${p.keyword} — Carrosserie Pro`,
          width: meta.width,
          height: meta.height,
        }
      : null;

    if (!meta) console.warn(`  ⚠ image absente pour ${slug} (${imgPath})`);

    pages.push({
      slug,
      page_type: 'city_service',
      city: p.ville,
      service: p.service,
      meta_title: p.metaTitle,
      meta_description: p.metaDescription,
      h1: p.h1,
      content: {
        heroTitle: p.h1,
        heroSubtitle: p.heroSubtitle,
        heroImage,
        intro: '',
        seoSections,
        faq: p.faq,
        highlights: [],
        internalLinks: p.relatedServices.map((href) => ({
          url: href,
          anchor: anchorFromHref(href),
        })),
        gallery: [],
        updatedDate: new Date().toISOString().split('T')[0],
      },
    });
  }

  return pages;
}

// ─── Elaya Rituel ───────────────────────────────────────────────────────

/**
 * Les trois piliers gardent leur forme typée (`content.pillar`, voir
 * `lib/content/_types.ts` du site) : le gabarit reste identique après la
 * bascule. Le dashboard édite h1, title, description, FAQ et image hero ;
 * `content.faq` et `content.heroImage` sont donc aussi posés à plat, et la
 * page les préfère au pilier quand ils existent.
 */
async function importElayarituel(): Promise<ImportedPage[]> {
  const projectPath = '/home/ubuntu/sites/Elayarituel';
  const { pillars } = (await import(`${projectPath}/lib/content/index.ts`)) as {
    pillars: Record<string, Record<string, unknown>>;
  };
  const { services, siteConfig } = (await import(`${projectPath}/lib/config.ts`)) as {
    services: Array<{ slug: string; title: string }>;
    siteConfig: { name: string };
  };

  const pages: ImportedPage[] = [];
  for (const service of services) {
    const pillar = pillars[service.slug];
    if (!pillar) {
      console.log(`  (ignoré) ${service.slug} : pas de pilier dans lib/content`);
      continue;
    }
    const hero = pillar.heroImage as { src: string; alt: string; position?: string };
    const meta = await imageMeta(hero.src, projectPath);
    const faq = (pillar.faq as Array<{ q: string; a: string }>).map((f) => ({ question: f.q, answer: f.a }));
    const lead = pillar.lead as string[];

    pages.push({
      slug: `prestations/${service.slug}`,
      page_type: 'city_service',
      city: 'Perpignan',
      service: service.title,
      // Le site sert le title en absolu depuis le CMS : on stocke la forme complète,
      // identique à ce que le gabarit « %s | Elaya Rituel » du layout produisait.
      meta_title: `${pillar.metaTitle as string} | ${siteConfig.name}`,
      meta_description: pillar.metaDescription as string,
      h1: `${service.title} à domicile à Perpignan`,
      content: {
        pillar,
        heroImage: { src: hero.src, alt: hero.alt, position: hero.position, ...(meta || {}) },
        intro: lead.join('\n\n'),
        seoSections: [],
        faq,
        highlights: [],
        trustSignals: [],
        internalLinks: [],
        gallery: [],
      },
    });
  }
  return pages;
}

const IMPORTERS: Record<string, () => Promise<ImportedPage[]>> = {
  carrosserie: importCarrosserie,
  elayarituel: importElayarituel,
};

// ─── Exécution ──────────────────────────────────────────────────────────

async function main() {
  const importer = IMPORTERS[siteKey!];
  if (!importer) {
    console.error(`Aucun importeur pour "${siteKey}". Disponibles : ${Object.keys(IMPORTERS).join(', ')}`);
    process.exit(1);
  }

  const pages = await importer();
  const db = getSupabase();

  const { data: existing } = await db
    .from('seo_pages')
    .select('id, slug, status, content')
    .eq('site_key', siteKey);

  const bySlug = new Map((existing || []).map((p) => [p.slug, p]));
  const importedSlugs = new Set(pages.map((p) => p.slug));

  console.log(`\n${pages.length} page(s) lues dans les fichiers de ${siteKey}\n`);

  for (const p of pages) {
    const found = bySlug.get(p.slug);
    const wc = [
      p.content.intro,
      ...(p.content.seoSections as { content: string }[]).map((s) => s.content),
      ...(p.content.faq as { answer: string }[]).map((f) => f.answer),
    ].join(' ').split(/\s+/).filter(Boolean).length;

    const action = found ? `MAJ   (${found.status})` : 'CREE ';
    console.log(
      `  ${action} ${p.slug.padEnd(38)} ${String((p.content.seoSections as unknown[]).length).padStart(2)} sections · ` +
      `${String((p.content.faq as unknown[]).length).padStart(2)} FAQ · ${String(wc).padStart(4)} mots · ` +
      `${(p.content.heroImage ? 'image' : 'SANS IMAGE')}`
    );
  }

  // Pages en base absentes des fichiers : ni supprimées ni republiées, juste signalées
  const orphans = (existing || []).filter((p) => !importedSlugs.has(p.slug) && p.status === 'published');
  if (orphans.length > 0) {
    console.log(`\n  ⚠ ${orphans.length} page(s) publiées en base mais absentes des fichiers (laissées telles quelles) :`);
    for (const o of orphans) console.log(`      ${o.slug}`);
  }

  if (dryRun) {
    console.log('\n--dry-run : rien n\'a été écrit.\n');
    return;
  }

  let created = 0;
  let updated = 0;

  for (const p of pages) {
    const found = bySlug.get(p.slug);
    // Le profil de score choisi dans le dashboard survit au ré-import.
    const profile = (found?.content as Record<string, unknown> | null)?.profile;
    const row = {
      site_key: siteKey,
      slug: p.slug,
      page_type: p.page_type,
      city: p.city,
      service: p.service,
      meta_title: p.meta_title,
      meta_description: p.meta_description,
      h1: p.h1,
      content: profile ? { profile, ...p.content } : p.content,
      status: 'published',
      updated_at: new Date().toISOString(),
    };

    if (found) {
      const { error } = await db.from('seo_pages').update(row).eq('id', found.id);
      if (error) throw new Error(`MAJ ${p.slug} : ${error.message}`);
      updated++;
    } else {
      const { error } = await db.from('seo_pages').insert(row);
      if (error) throw new Error(`Creation ${p.slug} : ${error.message}`);
      created++;
    }
  }

  console.log(`\n✅ ${created} créée(s), ${updated} mise(s) à jour.\n`);
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
