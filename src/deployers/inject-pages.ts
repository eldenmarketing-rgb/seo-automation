import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { sites, SiteConfig } from '../../config/sites.js';
import { SeoPageRow } from '../db/supabase.js';
import * as logger from '../utils/logger.js';

/**
 * Extract existing slugs from a site's data files to avoid regenerating existing pages.
 */
export function getExistingSlugsFromFiles(siteKey: string): string[] {
  const site = sites[siteKey];
  if (!site) return [];

  const slugs: string[] = [];
  const slugRegex = /slug:\s*["']([^"']+)["']/g;

  const filesToScan: string[] = [];

  switch (siteKey) {
    case 'garage':
      filesToScan.push(`${site.projectPath}/data/cities.ts`);
      filesToScan.push(`${site.projectPath}/data/services.ts`);
      break;
    case 'vtc':
      filesToScan.push(`${site.projectPath}/lib/cities.tsx`);
      break;
    case 'carrosserie':
      filesToScan.push(`${site.projectPath}/data/generated-pages.ts`);
      break;
    case 'massage':
      filesToScan.push(`${site.projectPath}/data/seo-pages.ts`);
      break;
    case 'restaurant':
      filesToScan.push(`${site.projectPath}/data/seo-pages.ts`);
      filesToScan.push(`${site.projectPath}/data/catalogue.ts`);
      filesToScan.push(`${site.projectPath}/data/blog.ts`);
      break;
    case 'voitures':
      filesToScan.push(`${site.projectPath}/data/cars.ts`);
      filesToScan.push(`${site.projectPath}/data/cities.ts`);
      break;
  }

  for (const filePath of filesToScan) {
    if (!existsSync(filePath)) continue;
    const content = readFileSync(filePath, 'utf-8');
    let match;
    while ((match = slugRegex.exec(content)) !== null) {
      slugs.push(match[1]);
    }
  }

  return [...new Set(slugs)];
}

/**
 * Inject generated SEO pages into each site's data files.
 * Each site has a different data strategy, so we handle each case.
 */
export async function injectPages(siteKey: string, pages: SeoPageRow[]): Promise<string[]> {
  const site = sites[siteKey];
  if (!site) throw new Error(`Unknown site: ${siteKey}`);

  switch (site.dataStrategy) {
    case 'data-files':
      if (siteKey === 'garage') return injectGaragePages(site, pages);
      if (siteKey === 'vtc') return injectVtcPages(site, pages);
      if (siteKey === 'voitures') return injectVoituresPages(site, pages);
      if (siteKey === 'restaurant') return injectRestaurantPages(site, pages);
      return [];
    case 'config-only':
      return injectCarrosseriePages(site, pages);
    case 'create-dynamic':
      return injectMassagePages(site, pages);
    default:
      throw new Error(`Unknown data strategy: ${site.dataStrategy}`);
  }
}

// ─── GARAGE: Inject city pages + merge service pages ────────

function injectGaragePages(site: SiteConfig, pages: SeoPageRow[]): string[] {
  const injected: string[] = [];

  // Split by type
  const cityHubs = pages.filter(p => p.page_type === 'city');
  const servicePages = pages.filter(p => p.page_type === 'city_service');

  // 1. City hubs → data/cities.ts (append new)
  if (cityHubs.length > 0) {
    const citiesPath = `${site.projectPath}/data/cities.ts`;
    let citiesContent = readFileSync(citiesPath, 'utf-8');

    for (const page of cityHubs) {
      if (citiesContent.includes(`slug: "${page.slug}"`)) {
        logger.warn(`City slug "${page.slug}" already exists, skipping`);
        continue;
      }
      const c = page.content as Record<string, unknown>;
      const entry = generateGarageCityEntry(page, c);
      const replaced = citiesContent.replace(/\n\];\s*(\n|$)/, `\n${entry}\n];\n`);
      if (replaced === citiesContent) {
        logger.warn(`Could not find array closing for ${page.slug} in cities.ts`);
        continue;
      }
      citiesContent = replaced;
      injected.push(page.slug);
    }

    writeFileSync(citiesPath, citiesContent, 'utf-8');
    logger.success(`Injected ${cityHubs.length} city hubs into cities.ts`);
  }

  // 2. Service pages → data/services.ts (merge existing or append new)
  if (servicePages.length > 0) {
    const servicesPath = `${site.projectPath}/data/services.ts`;
    let servicesContent = readFileSync(servicesPath, 'utf-8');

    for (const page of servicePages) {
      const c = page.content as Record<string, unknown>;

      if (servicesContent.includes(`slug: "${page.slug}"`)) {
        // MERGE: replace SEO fields, keep static fields (process, brands, etc.)
        servicesContent = mergeGarageServiceEntry(servicesContent, page, c);
        injected.push(page.slug);
        logger.info(`Merged service: ${page.slug}`);
      } else {
        // NEW service page — append with defaults
        const entry = generateGarageServiceEntry(page, c);
        const replaced = servicesContent.replace(/\n\];\s*(\n|$)/, `\n${entry}\n];\n`);
        if (replaced === servicesContent) {
          logger.warn(`Could not find array closing for ${page.slug} in services.ts`);
          continue;
        }
        servicesContent = replaced;
        injected.push(page.slug);
        logger.info(`Appended new service: ${page.slug}`);
      }
    }

    writeFileSync(servicesPath, servicesContent, 'utf-8');
    logger.success(`Injected/merged ${servicePages.length} service pages into services.ts`);
  }

  updateSitemap(site, injected);
  return injected;
}

/** Map internalLinks label→anchor for garage compatibility */
function mapLinksToAnchors(links: Array<{ slug: string; label?: string; anchor?: string }>): Array<{ slug: string; anchor: string }> {
  return links.map(l => ({
    slug: l.slug,
    anchor: l.anchor || l.label || l.slug,
  }));
}

/**
 * Find matching brace end, skipping string literals.
 * startIdx must point to the opening { or [.
 */
function findMatchingBrace(text: string, startIdx: number): number {
  const open = text[startIdx];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1; // not found
}

/** Extract a top-level field value from a TS object literal string, string-aware */
function extractTsField(block: string, fieldName: string): string | null {
  // Match "fieldName:" at start of line or after whitespace (not inside a string)
  // We search for the field outside of string context
  const pattern = new RegExp(`(?:^|[,{\\s])${fieldName}:\\s*`, 'gm');
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(block)) !== null) {
    const valStart = match.index + match[0].length;
    const firstChar = block[valStart];

    if (firstChar === '[' || firstChar === '{') {
      const end = findMatchingBrace(block, valStart);
      if (end !== -1) return block.slice(valStart, end + 1);
    } else if (firstChar === '"') {
      // Find closing quote (handle escapes)
      let i = valStart + 1;
      while (i < block.length) {
        if (block[i] === '\\') { i += 2; continue; }
        if (block[i] === '"') return block.slice(valStart, i + 1);
        i++;
      }
    } else {
      // Simple value — until comma or newline
      const rest = block.slice(valStart);
      const endMatch = rest.match(/^[^,\n]+/);
      if (endMatch) return endMatch[0].trim();
    }
  }
  return null;
}

/** Merge SEO content into an existing service entry in services.ts */
function mergeGarageServiceEntry(fileContent: string, page: SeoPageRow, c: Record<string, unknown>): string {
  const slug = page.slug;

  // Find the TOP-LEVEL ServicePage object for this slug.
  // The slug also appears inside internalLinks of other entries as { slug: "...", anchor: "..." }.
  // A ServicePage entry has "name:" right after slug, while InternalLink has "anchor:".
  const slugMarker = `slug: "${slug}"`;
  let markerIdx = -1;
  let searchFrom = 0;

  while (searchFrom < fileContent.length) {
    const idx = fileContent.indexOf(slugMarker, searchFrom);
    if (idx === -1) break;

    // Look at what follows the slug field: ", name:" = ServicePage, ", anchor:" = InternalLink
    const afterSlug = fileContent.slice(idx + slugMarker.length, idx + slugMarker.length + 30);
    if (afterSlug.includes('name:') || afterSlug.includes('name :')) {
      markerIdx = idx;
      break;
    }

    searchFrom = idx + slugMarker.length;
  }

  if (markerIdx === -1) return fileContent;

  // Walk backwards to find the opening { of this object
  let objStart = markerIdx;
  while (objStart > 0 && fileContent[objStart] !== '{') objStart--;

  // Walk forward using string-aware brace counting
  const objEnd = findMatchingBrace(fileContent, objStart);
  if (objEnd === -1) {
    logger.warn(`Could not find closing brace for ${slug}`);
    return fileContent;
  }

  const originalBlock = fileContent.slice(objStart, objEnd + 1);

  // Extract static fields we want to KEEP
  const name = extractTsField(originalBlock, 'name') || JSON.stringify(page.service || '');
  const emoji = extractTsField(originalBlock, 'emoji') || '"🔧"';
  const category = extractTsField(originalBlock, 'category') || '"entretien"';
  const canonical = extractTsField(originalBlock, 'canonical') || JSON.stringify('/' + slug);
  const heroImage = extractTsField(originalBlock, 'heroImage');
  const educationalTitle = extractTsField(originalBlock, 'educationalTitle') || JSON.stringify((c.seoSections as any)?.[0]?.title || '');
  const educationalContent = extractTsField(originalBlock, 'educationalContent') || JSON.stringify((c.seoSections as any)?.[0]?.content || '');
  const process = extractTsField(originalBlock, 'process') || '[]';
  const brands = extractTsField(originalBlock, 'brands') || '[]';
  const ctaTitle = extractTsField(originalBlock, 'ctaTitle') || JSON.stringify(`Besoin de ${page.service} à ${page.city} ? Appelez-nous`);
  const schemaService = extractTsField(originalBlock, 'schemaService') || `{ name: ${JSON.stringify(page.meta_title)}, description: ${JSON.stringify(page.meta_description)} }`;

  // New SEO content from Supabase
  const seoSections = (c.seoSections as Array<{ title: string; content: string }>) || [];
  const faq = (c.faq as Array<{ question: string; answer: string }>) || [];
  const rawLinks = (c.internalLinks as Array<{ slug: string; label?: string; anchor?: string }>) || [];
  const internalLinks = mapLinksToAnchors(rawLinks);

  const newBlock = `{ slug: ${JSON.stringify(slug)}, name: ${name}, emoji: ${emoji}, category: ${category},
    metaTitle: ${JSON.stringify(page.meta_title)},
    metaDescription: ${JSON.stringify(page.meta_description)},
    canonical: ${canonical}, h1: ${JSON.stringify(page.h1)},
    heroTitle: ${JSON.stringify(c.heroTitle || page.h1)},
    heroSubtitle: ${JSON.stringify(c.heroSubtitle || '')},${heroImage ? `\n    heroImage: ${heroImage},` : ''}
    intro: ${JSON.stringify(c.intro || '')},
    educationalTitle: ${educationalTitle},
    educationalContent: ${educationalContent},
    process: ${process},
    brands: ${brands},
    ctaTitle: ${ctaTitle},
    faq: ${JSON.stringify(faq, null, 6)},
    seoSections: ${JSON.stringify(seoSections, null, 6)},
    internalLinks: ${JSON.stringify(internalLinks, null, 6)},
    schemaService: ${schemaService},
  }`;

  return fileContent.slice(0, objStart) + newBlock + fileContent.slice(objEnd + 1);
}

/** Generate a new service entry (for services not yet in services.ts) */
function generateGarageServiceEntry(page: SeoPageRow, c: Record<string, unknown>): string {
  const seoSections = (c.seoSections as Array<{ title: string; content: string }>) || [];
  const faq = (c.faq as Array<{ question: string; answer: string }>) || [];
  const rawLinks = (c.internalLinks as Array<{ slug: string; label?: string; anchor?: string }>) || [];
  const internalLinks = mapLinksToAnchors(rawLinks);

  return `
  // ── ${page.service || page.slug} (auto-generated) ──────────────
  { slug: ${JSON.stringify(page.slug)}, name: ${JSON.stringify(page.service || '')}, emoji: "🔧", category: "entretien",
    metaTitle: ${JSON.stringify(page.meta_title)},
    metaDescription: ${JSON.stringify(page.meta_description)},
    canonical: ${JSON.stringify('/' + page.slug)}, h1: ${JSON.stringify(page.h1)},
    heroTitle: ${JSON.stringify(c.heroTitle || page.h1)},
    heroSubtitle: ${JSON.stringify(c.heroSubtitle || '')},
    intro: ${JSON.stringify(c.intro || '')},
    educationalTitle: ${JSON.stringify((seoSections[0] || {}).title || '')},
    educationalContent: ${JSON.stringify((seoSections[0] || {}).content || '')},
    process: [
      { icon: "📞", title: "Prise de rendez-vous", description: "Appelez-nous ou venez directement." },
      { icon: "🔧", title: "Intervention", description: "Diagnostic et intervention par nos techniciens." },
      { icon: "✅", title: "Restitution", description: "Rapport détaillé et facturation transparente." },
    ],
    brands: ["Renault","Peugeot","Citroën","Volkswagen","BMW","Mercedes","Toyota","Dacia","Hyundai","Kia","Ford","Opel","Fiat","Nissan","Honda"],
    ctaTitle: ${JSON.stringify(`Besoin de ${page.service} à ${page.city} ? Appelez-nous`)},
    faq: ${JSON.stringify(faq, null, 6)},
    seoSections: ${JSON.stringify(seoSections, null, 6)},
    internalLinks: ${JSON.stringify(internalLinks, null, 6)},
    schemaService: { name: ${JSON.stringify(page.meta_title)}, description: ${JSON.stringify(page.meta_description)} },
  },`;
}

function generateGarageCityEntry(page: SeoPageRow, c: Record<string, unknown>): string {
  const seoSections = (c.seoSections as Array<{ title: string; content: string }>) || [];
  const featuredServices = (c.featuredServices as Array<{ slug: string; name: string; description?: string }>) || [];
  const highlights = (c.highlights as string[]) || [];
  const nearbyPlaces = (c.nearbyPlaces as string[]) || [];
  const faq = (c.faq as Array<{ question: string; answer: string }>) || [];
  const rawLinks = (c.internalLinks as Array<{ slug: string; label?: string; anchor?: string }>) || [];
  const internalLinks = mapLinksToAnchors(rawLinks);

  return `
  // ── ${page.city || page.slug} (auto-generated) ──────────────
  {
    slug: ${JSON.stringify(page.slug)},
    name: ${JSON.stringify(page.city || '')},
    emoji: "📍",
    distance: ${JSON.stringify(c.distance || '—')},
    road: ${JSON.stringify(c.road || '—')},
    metaTitle: ${JSON.stringify(page.meta_title)},
    metaDescription: ${JSON.stringify(page.meta_description)},
    canonical: ${JSON.stringify('/' + page.slug)},
    h1: ${JSON.stringify(page.h1)},
    heroTitle: ${JSON.stringify(c.heroTitle || page.h1)},
    heroSubtitle: ${JSON.stringify(c.heroSubtitle || '')},
    intro: ${JSON.stringify(c.intro || '')},
    seoSections: ${JSON.stringify(seoSections, null, 6)},
    featuredServices: ${JSON.stringify(
      featuredServices.slice(0, 5).map(s => ({
        slug: s.slug,
        name: s.name,
        emoji: "🔧",
      })),
      null,
      6,
    )},
    highlights: ${JSON.stringify(highlights, null, 6)},
    nearbyPlaces: ${JSON.stringify(nearbyPlaces, null, 6)},
    linkedServices: ${JSON.stringify(
      internalLinks.slice(0, 4).map(l => l.slug),
      null,
      6,
    )},
    faq: ${JSON.stringify(faq, null, 6)},
  },`;
}

// ─── VTC: Append to lib/cities.tsx ─────────────────────────

function injectVtcPages(site: SiteConfig, pages: SeoPageRow[]): string[] {
  const injected: string[] = [];
  const filePath = `${site.projectPath}/lib/cities.tsx`;
  let content = readFileSync(filePath, 'utf-8');

  for (const page of pages) {
    if (content.includes(`slug: "${page.slug}"`)) {
      logger.warn(`Slug "${page.slug}" already exists in VTC cities, skipping`);
      continue;
    }

    const c = page.content as Record<string, unknown>;
    const seoSections = (c.seoSections as Array<{ title: string; content: string }>) || [];
    const highlights = (c.highlights as string[]) || [];
    const nearbyPlaces = (c.nearbyPlaces as string[]) || [];
    const faq = (c.faq as Array<{ question: string; answer: string }>) || [];

    const entry = `
  // ── ${page.city || page.slug} (auto-generated) ──────
  {
    slug: ${JSON.stringify(page.slug)},
    name: ${JSON.stringify(page.city || '')},
    metaTitle: ${JSON.stringify(page.meta_title)},
    metaDescription: ${JSON.stringify(page.meta_description)},
    h1: ${JSON.stringify(page.h1)},
    heroTitle: ${JSON.stringify(c.heroTitle || page.h1)},
    heroSubtitle: ${JSON.stringify(c.heroSubtitle || '')},
    intro: ${JSON.stringify(c.intro || '')},
    seoSections: ${JSON.stringify(seoSections, null, 6)},
    highlights: ${JSON.stringify(highlights, null, 6)},
    nearbyPlaces: ${JSON.stringify(nearbyPlaces, null, 6)},
    faq: ${JSON.stringify(faq, null, 6)},
  },`;

    const replaced = content.replace(/\n\];\s*(\n|$)/, `\n${entry}\n];\n`);
    if (replaced === content) {
      logger.warn(`Could not find array closing for ${page.slug} in VTC cities`);
      continue;
    }
    content = replaced;
    injected.push(page.slug);
  }

  writeFileSync(filePath, content, 'utf-8');
  logger.success(`Injected ${injected.length} pages into VTC cities`);
  updateSitemap(site, injected);
  return injected;
}

// ─── VOITURES: Append to data/cities.ts ─────────────────────

function injectVoituresPages(site: SiteConfig, pages: SeoPageRow[]): string[] {
  const injected: string[] = [];
  const filePath = `${site.projectPath}/data/cities.ts`;

  if (!existsSync(filePath)) {
    logger.error(`Voitures cities file not found: ${filePath}`);
    return [];
  }

  let content = readFileSync(filePath, 'utf-8');

  for (const page of pages) {
    if (content.includes(`slug: "${page.slug}"`)) {
      logger.warn(`Slug "${page.slug}" already exists in voitures cities, skipping`);
      continue;
    }

    const c = page.content as Record<string, unknown>;
    const seoSections = (c.seoSections as Array<{ title: string; content: string }>) || [];
    const highlights = (c.highlights as string[]) || [];
    const nearbyPlaces = (c.nearbyPlaces as string[]) || [];
    const faq = (c.faq as Array<{ question: string; answer: string }>) || [];
    const trustSignals = (c.trustSignals as string[]) || [];
    const internalLinks = (c.internalLinks as Array<{ slug: string; label: string }>) || [];
    const featuredServices = (c.featuredServices as Array<{ slug: string; name: string; description?: string }>) || [];

    const entry = `
  // ── ${page.city || page.slug} (auto-generated) ──────
  {
    slug: ${JSON.stringify(page.slug)},
    name: ${JSON.stringify(page.city || '')},
    metaTitle: ${JSON.stringify(page.meta_title)},
    metaDescription: ${JSON.stringify(page.meta_description)},
    h1: ${JSON.stringify(page.h1)},
    heroTitle: ${JSON.stringify(c.heroTitle || page.h1)},
    heroSubtitle: ${JSON.stringify(c.heroSubtitle || '')},
    intro: ${JSON.stringify(c.intro || '')},
    seoSections: ${JSON.stringify(seoSections, null, 6)},
    highlights: ${JSON.stringify(highlights, null, 6)},
    nearbyPlaces: ${JSON.stringify(nearbyPlaces, null, 6)},
    faq: ${JSON.stringify(faq, null, 6)},
    trustSignals: ${JSON.stringify(trustSignals, null, 6)},
    internalLinks: ${JSON.stringify(internalLinks, null, 6)},
    featuredServices: ${JSON.stringify(featuredServices, null, 6)},
    updatedDate: ${JSON.stringify(c.updatedDate || new Date().toISOString().split('T')[0])},
  },`;

    const replaced = content.replace(/\n\];\s*(\n|$)/, `\n${entry}\n];\n`);
    if (replaced === content) {
      logger.warn(`Could not find array closing for ${page.slug} in voitures cities`);
      continue;
    }
    content = replaced;
    injected.push(page.slug);
  }

  writeFileSync(filePath, content, 'utf-8');
  logger.success(`Injected ${injected.length} city pages into voitures data`);
  updateSitemap(site, injected);
  return injected;
}

// ─── CARROSSERIE: Add service pages to config ──────────────

function injectCarrosseriePages(site: SiteConfig, pages: SeoPageRow[]): string[] {
  const injected: string[] = [];

  // Carrosserie uses a different approach: create a data directory
  const dataDir = `${site.projectPath}/data`;
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

  const filePath = `${dataDir}/generated-pages.ts`;
  const existingContent = existsSync(filePath) ? readFileSync(filePath, 'utf-8') : '';

  const newEntries: string[] = [];
  for (const page of pages) {
    if (existingContent.includes(`slug: "${page.slug}"`)) {
      logger.warn(`Slug "${page.slug}" already in carrosserie generated pages, skipping`);
      continue;
    }

    const c = page.content as Record<string, unknown>;
    newEntries.push(`  {
    slug: ${JSON.stringify(page.slug)},
    name: ${JSON.stringify(page.city || page.service || '')},
    pageType: ${JSON.stringify(page.page_type)},
    metaTitle: ${JSON.stringify(page.meta_title)},
    metaDescription: ${JSON.stringify(page.meta_description)},
    h1: ${JSON.stringify(page.h1)},
    heroTitle: ${JSON.stringify(c.heroTitle || page.h1)},
    heroSubtitle: ${JSON.stringify(c.heroSubtitle || '')},
    intro: ${JSON.stringify(c.intro || '')},
    seoSections: ${JSON.stringify(c.seoSections || [], null, 6)},
    highlights: ${JSON.stringify(c.highlights || [], null, 6)},
    faq: ${JSON.stringify(c.faq || [], null, 6)},
  }`);
    injected.push(page.slug);
  }

  if (newEntries.length === 0) return [];

  if (!existingContent) {
    // Create new file
    writeFileSync(filePath, `// Auto-generated SEO pages for Carrosserie Pro
// DO NOT EDIT MANUALLY — managed by seo-automation

export interface GeneratedPage {
  slug: string;
  name: string;
  pageType: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  heroTitle: string;
  heroSubtitle: string;
  intro: string;
  seoSections: Array<{ title: string; content: string }>;
  highlights: string[];
  faq: Array<{ question: string; answer: string }>;
}

export const generatedPages: GeneratedPage[] = [
${newEntries.join(',\n')}
];

export function getGeneratedPageBySlug(slug: string): GeneratedPage | undefined {
  return generatedPages.find(p => p.slug === slug);
}
`, 'utf-8');
  } else {
    // Append to existing array
    let updated = existingContent.replace(/\n\];\s*\nexport function/, `\n${newEntries.map(e => e + ',').join('\n')}\n];\n\nexport function`);
    writeFileSync(filePath, updated, 'utf-8');
  }

  // Ensure the [page-slug]/page.tsx imports generated pages
  ensureCarrosserieImport(site);

  logger.success(`Injected ${injected.length} pages into carrosserie data`);
  updateSitemap(site, injected);
  return injected;
}

function ensureCarrosserieImport(site: SiteConfig) {
  const slugPagePath = `${site.projectPath}/${site.slugPageFile}`;
  const content = readFileSync(slugPagePath, 'utf-8');

  if (content.includes('generated-pages')) return; // Already imported

  // Add import at the top
  const importLine = `import { generatedPages, getGeneratedPageBySlug } from "@/data/generated-pages";\n`;
  let updated = content.replace(
    /^(import .+\n)+/m,
    (match) => match + importLine,
  );

  // Add to generateStaticParams
  updated = updated.replace(
    /return \[\.\.\.(\w+)\]/,
    (match, existing) => {
      return match.replace(']', ', ...generatedPages.map(p => ({ "page-slug": p.slug }))]');
    },
  );

  writeFileSync(slugPagePath, updated, 'utf-8');
  logger.info('Updated carrosserie [page-slug]/page.tsx with generated pages import');
}

// ─── MASSAGE: Create dynamic routing structure ─────────────

function injectMassagePages(site: SiteConfig, pages: SeoPageRow[]): string[] {
  const injected: string[] = [];

  // 1. Create data directory
  const dataDir = `${site.projectPath}/data`;
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

  // 2. Create types file if needed
  const typesDir = `${site.projectPath}/types`;
  if (!existsSync(typesDir)) mkdirSync(typesDir, { recursive: true });
  const typesFile = `${typesDir}/massage.ts`;
  if (!existsSync(typesFile)) {
    writeFileSync(typesFile, `export interface MassageSeoPage {
  slug: string;
  name: string;
  pageType: 'city' | 'service' | 'city_service';
  metaTitle: string;
  metaDescription: string;
  h1: string;
  heroTitle: string;
  heroSubtitle: string;
  intro: string;
  seoSections: Array<{ title: string; content: string }>;
  featuredServices?: Array<{ slug: string; name: string; description: string }>;
  highlights: string[];
  nearbyPlaces?: string[];
  faq: Array<{ question: string; answer: string }>;
}
`, 'utf-8');
  }

  // 3. Build pages data file
  const filePath = `${dataDir}/seo-pages.ts`;
  const existingContent = existsSync(filePath) ? readFileSync(filePath, 'utf-8') : '';

  const newEntries: string[] = [];
  for (const page of pages) {
    if (existingContent.includes(`slug: "${page.slug}"`)) {
      logger.warn(`Slug "${page.slug}" already in massage data, skipping`);
      continue;
    }

    const c = page.content as Record<string, unknown>;
    newEntries.push(`  {
    slug: ${JSON.stringify(page.slug)},
    name: ${JSON.stringify(page.city || page.service || '')},
    pageType: ${JSON.stringify(page.page_type)},
    metaTitle: ${JSON.stringify(page.meta_title)},
    metaDescription: ${JSON.stringify(page.meta_description)},
    h1: ${JSON.stringify(page.h1)},
    heroTitle: ${JSON.stringify(c.heroTitle || page.h1)},
    heroSubtitle: ${JSON.stringify(c.heroSubtitle || '')},
    intro: ${JSON.stringify(c.intro || '')},
    seoSections: ${JSON.stringify(c.seoSections || [], null, 6)},
    featuredServices: ${JSON.stringify(c.featuredServices || [], null, 6)},
    highlights: ${JSON.stringify(c.highlights || [], null, 6)},
    nearbyPlaces: ${JSON.stringify(c.nearbyPlaces || [], null, 6)},
    faq: ${JSON.stringify(c.faq || [], null, 6)},
  }`);
    injected.push(page.slug);
  }

  if (newEntries.length === 0) return [];

  if (!existingContent) {
    writeFileSync(filePath, `// Auto-generated SEO pages for Elaya Rituel
// DO NOT EDIT MANUALLY — managed by seo-automation

import type { MassageSeoPage } from "@/types/massage";

export const seoPages: MassageSeoPage[] = [
${newEntries.join(',\n')}
];

export function getSeoPageBySlug(slug: string): MassageSeoPage | undefined {
  return seoPages.find(p => p.slug === slug);
}
`, 'utf-8');
  } else {
    let updated = existingContent.replace(/\n\];\s*\nexport function/, `\n${newEntries.map(e => e + ',').join('\n')}\n];\n\nexport function`);
    writeFileSync(filePath, updated, 'utf-8');
  }

  // 4. Create [slug]/page.tsx if it doesn't exist
  ensureMassageDynamicRoute(site);

  logger.success(`Injected ${injected.length} pages into massage data`);
  updateSitemap(site, injected);
  return injected;
}

function ensureMassageDynamicRoute(site: SiteConfig) {
  const slugDir = `${site.projectPath}/app/[slug]`;
  const slugPage = `${slugDir}/page.tsx`;

  if (existsSync(slugPage)) return;

  mkdirSync(slugDir, { recursive: true });
  writeFileSync(slugPage, `import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { seoPages, getSeoPageBySlug } from "@/data/seo-pages";
import { siteConfig } from "@/lib/config";
import SectionWrapper from "@/components/ui/SectionWrapper";
import FAQ from "@/components/sections/FAQ";
import CallToAction from "@/components/sections/CallToAction";

export function generateStaticParams() {
  return seoPages.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getSeoPageBySlug(slug);
  if (!page) return {};
  return {
    title: page.metaTitle,
    description: page.metaDescription,
    alternates: { canonical: \`\${siteConfig.siteUrl}/\${page.slug}\` },
  };
}

export default async function SeoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = getSeoPageBySlug(slug);
  if (!page) notFound();

  return (
    <>
      {/* Hero */}
      <SectionWrapper background="white">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="section-title">{page.h1}</h1>
          <p className="section-subtitle">{page.heroSubtitle}</p>
        </div>
      </SectionWrapper>

      {/* Intro */}
      <SectionWrapper>
        <div className="max-w-3xl mx-auto prose prose-lg">
          <p>{page.intro}</p>
        </div>
      </SectionWrapper>

      {/* SEO Sections */}
      {page.seoSections.map((section, i) => (
        <SectionWrapper key={i} background={i % 2 === 0 ? "gray" : "white"}>
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">{section.title}</h2>
            <div className="prose prose-lg">
              <p>{section.content}</p>
            </div>
          </div>
        </SectionWrapper>
      ))}

      {/* Highlights */}
      {page.highlights.length > 0 && (
        <SectionWrapper background="white">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-center">Pourquoi nous choisir</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {page.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-3 p-4 bg-rose-50 rounded-lg">
                  <span className="text-rose-500 mt-0.5">✓</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>
        </SectionWrapper>
      )}

      {/* Featured Services */}
      {page.featuredServices && page.featuredServices.length > 0 && (
        <SectionWrapper>
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-center">Nos prestations</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {page.featuredServices.map((s, i) => (
                <div key={i} className="p-5 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <h3 className="font-semibold mb-2">{s.name}</h3>
                  <p className="text-sm text-gray-600">{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        </SectionWrapper>
      )}

      {/* FAQ */}
      {page.faq.length > 0 && (
        <SectionWrapper background="gray">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-center">Questions fréquentes</h2>
            <div className="space-y-4">
              {page.faq.map((f, i) => (
                <details key={i} className="bg-white rounded-lg p-5 shadow-sm">
                  <summary className="font-semibold cursor-pointer">{f.question}</summary>
                  <p className="mt-3 text-gray-600">{f.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </SectionWrapper>
      )}

      <CallToAction />

      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: page.faq.map(f => ({
              "@type": "Question",
              name: f.question,
              acceptedAnswer: { "@type": "Answer", text: f.answer },
            })),
          }),
        }}
      />
    </>
  );
}
`, 'utf-8');

  logger.success('Created [slug]/page.tsx for Elaya Rituel');
}

// ─── RESTAURANT: Rewrite data/seo-pages.ts with unique content ──

function injectRestaurantPages(site: SiteConfig, pages: SeoPageRow[]): string[] {
  const injected: string[] = [];
  const filePath = `${site.projectPath}/data/seo-pages.ts`;

  if (!existsSync(filePath)) {
    logger.error(`Restaurant data file not found: ${filePath}`);
    return [];
  }

  let content = readFileSync(filePath, 'utf-8');

  for (const page of pages) {
    if (content.includes(`slug: "${page.slug}"`)) {
      // Replace existing page content
      const c = page.content as Record<string, unknown>;
      const entry = generateRestaurantEntry(page, c);

      // Try to replace the existing cityPage() call or object for this slug
      // Match cityPage("slug", ...) pattern
      const cityPageRegex = new RegExp(
        `cityPage\\("${page.slug}"[^)]*\\),?`,
        'g'
      );
      if (cityPageRegex.test(content)) {
        content = content.replace(cityPageRegex, entry + ',');
        injected.push(page.slug);
        logger.info(`Replaced cityPage() for ${page.slug}`);
      } else {
        // Try matching a full object block with this slug
        const objRegex = new RegExp(
          `\\{[\\s\\S]*?slug:\\s*"${page.slug}"[\\s\\S]*?\\},`,
          'g'
        );
        if (objRegex.test(content)) {
          content = content.replace(objRegex, entry + ',');
          injected.push(page.slug);
          logger.info(`Replaced object for ${page.slug}`);
        } else {
          logger.warn(`Could not find entry for ${page.slug} to replace`);
        }
      }
    } else {
      // Append new page
      const c = page.content as Record<string, unknown>;
      const entry = generateRestaurantEntry(page, c);
      content = content.replace(/\n\];\s*\nexport function/, `\n  ${entry},\n];\n\nexport function`);
      injected.push(page.slug);
      logger.info(`Appended new page: ${page.slug}`);
    }
  }

  writeFileSync(filePath, content, 'utf-8');
  logger.success(`Restaurant: injected/updated ${injected.length} pages in ${filePath}`);
  updateSitemap(site, injected);
  return injected;
}

function generateRestaurantEntry(page: SeoPageRow, c: Record<string, unknown>): string {
  const seoSections = (c.seoSections as Array<{ title: string; content: string }>) || [];
  const faq = (c.faq as Array<{ question: string; answer: string }>) || [];
  const highlights = (c.highlights as string[]) || [];
  const trustSignals = (c.trustSignals as string[]) || [];
  const internalLinks = (c.internalLinks as Array<{ slug: string; label: string }>) || [];

  return `  {
    slug: ${JSON.stringify(page.slug)},
    metaTitle: ${JSON.stringify(page.meta_title)},
    metaDescription: ${JSON.stringify(page.meta_description)},
    h1: ${JSON.stringify(page.h1)},
    heroTitle: ${JSON.stringify(c.heroTitle || page.h1)},
    heroSubtitle: ${JSON.stringify(c.heroSubtitle || '')},
    intro: ${JSON.stringify(c.intro || '')},
    highlights: ${JSON.stringify(highlights, null, 6)},
    seoSections: ${JSON.stringify(seoSections, null, 6)},
    faq: ${JSON.stringify(faq, null, 6)},
    trustSignals: ${JSON.stringify(trustSignals, null, 6)},
    internalLinks: ${JSON.stringify(internalLinks, null, 6)},
    updatedDate: ${JSON.stringify(c.updatedDate || new Date().toISOString().split('T')[0])},
  }`;
}

// ─── Sitemap update helper ─────────────────────────────────

function updateSitemap(site: SiteConfig, newSlugs: string[]) {
  if (newSlugs.length === 0) return;

  const sitemapPath = `${site.projectPath}/next-sitemap.config.js`;
  if (!existsSync(sitemapPath)) return;

  let content = readFileSync(sitemapPath, 'utf-8');

  // Check if there's a lastmod map we need to update
  const today = new Date().toISOString().split('T')[0];
  for (const slug of newSlugs) {
    // Add to lastmod map if it exists
    if (content.includes('lastModMap')) {
      const entry = `    '/${slug}': '${today}',`;
      content = content.replace(
        /const lastModMap = \{/,
        `const lastModMap = {\n${entry}`,
      );
    }
  }

  writeFileSync(sitemapPath, content, 'utf-8');
}
