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

// ─── Débarras Habitat ───────────────────────────────────────────────────

/**
 * Même mécanique qu'Elaya Rituel : cinq piliers typés (`content.pillar`),
 * gabarit identique après bascule. Différences : pas d'image hero dans les
 * piliers, metaTitle stocké tel quel (le gabarit sert déjà le title en
 * absolu, sans suffixe de marque), H1 « à Perpignan » (pas « à domicile »).
 */
async function importDebarras(): Promise<ImportedPage[]> {
  const projectPath = '/home/ubuntu/sites/Debarras-Habitat';
  const { pillars } = (await import(`${projectPath}/lib/content/index.ts`)) as {
    pillars: Record<string, Record<string, unknown>>;
  };
  const { services } = (await import(`${projectPath}/lib/config.ts`)) as {
    services: Array<{ slug: string; title: string }>;
  };

  const pages: ImportedPage[] = [];
  for (const service of services) {
    const pillar = pillars[service.slug];
    if (!pillar) {
      console.log(`  (ignoré) ${service.slug} : pas de pilier dans lib/content`);
      continue;
    }
    const hero = pillar.heroImage as { src: string; alt: string } | undefined;
    const meta = hero ? await imageMeta(hero.src, projectPath) : null;
    const faq = (pillar.faq as Array<{ q: string; a: string }>).map((f) => ({ question: f.q, answer: f.a }));
    const lead = pillar.lead as string[];

    pages.push({
      slug: `prestations/${service.slug}`,
      page_type: 'city_service',
      city: 'Perpignan',
      service: service.title,
      meta_title: pillar.metaTitle as string,
      meta_description: pillar.metaDescription as string,
      h1: `${service.title} à Perpignan`,
      content: {
        pillar,
        ...(hero ? { heroImage: { src: hero.src, alt: hero.alt, ...(meta || {}) } } : {}),
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

// ─── Garage Perpignan ───────────────────────────────────────────────────

/**
 * Les 19 pages service vivent dans `data/services.ts` sous la forme typée
 * `ServicePage` (hero, bloc pédagogique, étapes, marques, FAQ, sections SEO,
 * maillage, schema). Le gabarit `ServicePageTemplate` reste identique après
 * bascule : on stocke l'objet entier dans `content`, et le dashboard édite
 * h1/title/description/intro/sections/FAQ à plat — les autres champs
 * survivent aux éditions (l'éditeur envoie `{ ...content, [champ] }`).
 * Le fichier est en CommonJS (pas de `"type": "module"`) : `createRequire`.
 */
async function importGarage(): Promise<ImportedPage[]> {
  const projectPath = '/home/ubuntu/sites/Site_Garage';
  const { createRequire } = await import('node:module');
  const { servicePages } = createRequire(import.meta.url)(`${projectPath}/data/services.ts`) as {
    servicePages: Array<Record<string, unknown> & { slug: string; name: string }>;
  };

  const pages: ImportedPage[] = [];
  for (const [index, s] of servicePages.entries()) {
    const heroSrc = typeof s.heroImage === 'string' ? s.heroImage : null;
    const meta = heroSrc ? await imageMeta(heroSrc, projectPath) : null;
    const { slug, metaTitle, metaDescription, h1, canonical, heroImage, ...rest } = s;
    void canonical;
    void heroImage;

    pages.push({
      slug,
      page_type: 'service',
      city: 'Perpignan',
      service: s.name,
      // Le layout du site n'a pas de template de title : le metaTitle est déjà complet.
      meta_title: metaTitle as string,
      meta_description: metaDescription as string,
      // Le gabarit rend `heroTitle` en <h1> ; le champ `h1` du fichier n'était rendu
      // nulle part. La colonne porte donc ce qui est servi, sinon le dashboard
      // affiche un H1 que personne ne voit.
      h1: (typeof s.heroTitle === 'string' && s.heroTitle) || (h1 as string),
      content: {
        ...rest,
        // Ordre d'affichage dans les listes (accueil, /services) : celui du fichier.
        displayOrder: index,
        ...(heroSrc ? { heroImage: { src: heroSrc, alt: s.name, ...(meta || {}) } } : {}),
        seoSections: (s.seoSections as unknown[] | undefined) ?? [],
        faq: (s.faq as unknown[] | undefined) ?? [],
        highlights: [],
        trustSignals: [],
        gallery: [],
        updatedDate: new Date().toISOString().split('T')[0],
      },
    });
  }
  return pages;
}

// ─── Mon Sauveur (livraison alcool nuit) ────────────────────────────────

/**
 * 33 pages `[slug]` (19 villes + 14 thématiques) assemblées par `data/seo-pages.ts`
 * (Pages Router). Le gabarit rend `heroTitle` en <h1> et `h1` dans le fil
 * d'Ariane : la colonne `h1` porte donc le heroTitle (ce qui est servi, ce que
 * le dashboard édite) et l'ancien `h1` devient `content.breadcrumbLabel`.
 * `internalLinks` garde la forme du site `{ slug, label }` ; `lib/cms.ts` du
 * site accepte aussi `{ url, anchor }` que le dashboard écrit.
 */
async function importRestaurant(): Promise<ImportedPage[]> {
  const projectPath = '/home/ubuntu/sites/Mon-Sauveur';
  const { createRequire } = await import('node:module');
  const { seoPages, ALL_CITY_LINKS } = createRequire(import.meta.url)(`${projectPath}/data/seo-pages.ts`) as {
    seoPages: Array<Record<string, unknown> & { slug: string; h1: string; heroTitle: string }>;
    ALL_CITY_LINKS: Array<{ slug: string; label: string }>;
  };
  const labels = new Map(ALL_CITY_LINKS.map((l) => [l.slug, l.label]));

  const pages: ImportedPage[] = [];
  for (const [index, p] of seoPages.entries()) {
    const isCity = /^livraison-alcool-nuit-/.test(p.slug);
    const label = labels.get(p.slug) ?? p.h1;
    const city = isCity ? label.replace(/^Livraison alcool nuit /, '') : 'Perpignan';
    const { slug, metaTitle, metaDescription, h1, heroTitle, ...rest } = p;
    void slug;

    pages.push({
      slug: p.slug,
      page_type: isCity ? 'city' : 'service',
      city,
      service: isCity ? 'Livraison alcool nuit' : label,
      meta_title: metaTitle as string,
      meta_description: metaDescription as string,
      h1: heroTitle.replace(/\s*\n\s*/g, ' ').trim(),
      content: {
        ...rest,
        breadcrumbLabel: h1,
        displayOrder: index,
        seoSections: (p.seoSections as unknown[] | undefined) ?? [],
        faq: (p.faq as unknown[] | undefined) ?? [],
        highlights: (p.highlights as unknown[] | undefined) ?? [],
        trustSignals: (p.trustSignals as unknown[] | undefined) ?? [],
        internalLinks: (p.internalLinks as unknown[] | undefined) ?? [],
        gallery: [],
        updatedDate: (p.updatedDate as string | undefined) ?? new Date().toISOString().split('T')[0],
      },
    });
  }
  return pages;
}

const IMPORTERS: Record<string, () => Promise<ImportedPage[]>> = {
  carrosserie: importCarrosserie,
  elayarituel: importElayarituel,
  debarras: importDebarras,
  garage: importGarage,
  restaurant: importRestaurant,
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
    // Le profil de score choisi dans le dashboard et le brief d'analyse
    // survivent au ré-import : ils ne décrivent pas le contenu, ils le préparent.
    const kept: Record<string, unknown> = {};
    for (const k of ['profile', 'brief'] as const) {
      const v = (found?.content as Record<string, unknown> | null)?.[k];
      if (v) kept[k] = v;
    }
    const row = {
      site_key: siteKey,
      slug: p.slug,
      page_type: p.page_type,
      city: p.city,
      service: p.service,
      meta_title: p.meta_title,
      meta_description: p.meta_description,
      h1: p.h1,
      content: { ...kept, ...p.content },
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
