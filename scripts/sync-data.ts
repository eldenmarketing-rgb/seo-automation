/**
 * sync-data.ts — Synchronize seo_pages between Supabase and site data files.
 *
 * Part A: File-only pages → insert into Supabase (status: published)
 *   - Restaurant (42 pages from city-pages/*.ts + seo-pages.ts thematic)
 *   - Garage (17 pages from data/services.ts + data/cities.ts)
 *   - VTC (17 pages from lib/cities.tsx)
 *   - Voitures: SKIPPED — file slugs are car inventory, not SEO pages
 *
 * Part B: Supabase-only pages → inject into site data files
 *   - Garage (10 pages)
 *   - VTC (8 pages)
 */

import dotenv from 'dotenv';
dotenv.config();

import { readFileSync, existsSync, readdirSync } from 'fs';
import path from 'path';
import { sites } from '../config/sites.js';
import { getSupabase, upsertSeoPage, SeoPageRow } from '../src/db/supabase.js';
import { injectPages, getExistingSlugsFromFiles } from '../src/deployers/inject-pages.js';
import * as logger from '../src/utils/logger.js';

// ─── File Parser ─────────────────────────────────────────────────

interface ParsedPage {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  heroTitle: string;
  heroSubtitle: string;
  intro: string;
  content: Record<string, unknown>;
}

/**
 * Extract string field from a TS object block.
 * Handles both: field: "value" and field: 'value'
 * Also handles multi-line JSON.stringify output.
 */
function extractField(block: string, field: string): string {
  // Try simple single-line: field: "value",
  const simpleRe = new RegExp(`${field}:\\s*["'\`]([^"'\`]*?)["'\`]`);
  const m = simpleRe.exec(block);
  if (m) return m[1].replace(/\\n/g, '\n');

  // Try JSON.stringify format: field: "value that may have \"escapes\"",
  const jsonRe = new RegExp(`${field}:\\s*"((?:[^"\\\\]|\\\\.)*?)"`, 's');
  const jm = jsonRe.exec(block);
  if (jm) {
    try { return JSON.parse(`"${jm[1]}"`); } catch { return jm[1]; }
  }

  return '';
}

/**
 * Extract an array field (like seoSections, faq, highlights) as raw JSON.
 */
function extractArrayField(block: string, field: string): unknown[] {
  // Find field: [ ... ]  (possibly multi-line)
  const re = new RegExp(`${field}:\\s*(\\[)`, 's');
  const m = re.exec(block);
  if (!m) return [];

  const startIdx = m.index + m[0].length - 1; // position of '['
  let depth = 0;
  let endIdx = startIdx;
  for (let i = startIdx; i < block.length; i++) {
    if (block[i] === '[') depth++;
    else if (block[i] === ']') {
      depth--;
      if (depth === 0) { endIdx = i + 1; break; }
    }
  }

  const raw = block.slice(startIdx, endIdx);
  try {
    // Convert JS object notation to JSON-parseable format
    const jsonStr = raw
      .replace(/(\w+)\s*:/g, '"$1":')          // unquoted keys → quoted
      .replace(/'/g, '"')                        // single → double quotes
      .replace(/,\s*([}\]])/g, '$1')             // trailing commas
      .replace(/"(\w+)":/g, (_, k) => `"${k}":`) // ensure proper key quoting
    ;
    return JSON.parse(jsonStr);
  } catch {
    return [];
  }
}

/**
 * Parse a TypeScript file that contains objects with slug fields.
 * Splits file into object blocks and extracts page data.
 */
function parseDataFile(filePath: string): ParsedPage[] {
  if (!existsSync(filePath)) return [];
  const content = readFileSync(filePath, 'utf-8');
  const pages: ParsedPage[] = [];

  // Find all top-level object blocks: { ... slug: "..." ... }
  // We split by finding opening braces at consistent indentation
  const objectBlocks: string[] = [];
  let depth = 0;
  let blockStart = -1;
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];

    // Track string boundaries
    if (!inString && (ch === '"' || ch === "'" || ch === '`')) {
      inString = true;
      stringChar = ch;
      continue;
    }
    if (inString) {
      if (ch === '\\') { i++; continue; } // skip escaped
      if (ch === stringChar) inString = false;
      continue;
    }

    if (ch === '{') {
      if (depth === 0 || (depth === 1 && blockStart === -1)) {
        blockStart = i;
      }
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth <= 0 && blockStart !== -1) {
        const block = content.slice(blockStart, i + 1);
        if (block.includes('slug:') && block.includes('metaTitle')) {
          objectBlocks.push(block);
        }
        blockStart = -1;
        depth = Math.max(depth, 0);
      }
    }
  }

  for (const block of objectBlocks) {
    const slug = extractField(block, 'slug');
    if (!slug) continue;

    const metaTitle = extractField(block, 'metaTitle');
    const metaDescription = extractField(block, 'metaDescription');
    const h1 = extractField(block, 'h1');
    const heroTitle = extractField(block, 'heroTitle');
    const heroSubtitle = extractField(block, 'heroSubtitle');
    const intro = extractField(block, 'intro');

    const seoSections = extractArrayField(block, 'seoSections');
    const faq = extractArrayField(block, 'faq');
    const highlights = extractArrayField(block, 'highlights');
    const trustSignals = extractArrayField(block, 'trustSignals');
    const internalLinks = extractArrayField(block, 'internalLinks');

    pages.push({
      slug,
      metaTitle: metaTitle || `${h1} | ${slug}`,
      metaDescription: metaDescription || '',
      h1: h1 || slug,
      heroTitle,
      heroSubtitle,
      intro,
      content: {
        heroTitle,
        heroSubtitle,
        intro,
        seoSections,
        faq,
        highlights,
        trustSignals,
        internalLinks,
      },
    });
  }

  return pages;
}

/**
 * Determine page_type from slug pattern.
 */
function inferPageType(siteKey: string, slug: string): 'city' | 'service' | 'city_service' {
  // Restaurant: all are city pages (livraison-alcool-nuit-CITY) or thematic (apero-perpignan)
  if (siteKey === 'restaurant') return 'city';

  // Garage: service pages contain service keywords like vidange, freins, etc.
  if (siteKey === 'garage') {
    const serviceKeywords = ['vidange', 'entretien-voiture', 'controle-technique', 'freins', 'courroie',
      'embrayage', 'reparation', 'amortisseurs', 'echappement', 'diagnostic', 'climatisation',
      'pneus', 'fap', 'vanne-egr', 'decalaminage', 'turbo', 'injecteurs', 'boite-vitesse'];
    if (serviceKeywords.some(k => slug.startsWith(k))) return 'service';
    return 'city';
  }

  // VTC: all taxi-vtc-CITY
  if (siteKey === 'vtc') return 'city';

  return 'city';
}

/**
 * Infer city name from slug.
 */
function inferCity(siteKey: string, slug: string): string {
  if (siteKey === 'restaurant') {
    // livraison-alcool-nuit-perpignan → Perpignan
    const cityPart = slug.replace(/^livraison-alcool-nuit-/, '').replace(/^apero-/, '').replace(/^epicerie-de-nuit-/, '').replace(/^livraison-alcool-pas-cher-/, '');
    return cityPart.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-');
  }
  if (siteKey === 'garage') {
    const cityPart = slug.replace(/^garage-/, '');
    return cityPart.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-');
  }
  if (siteKey === 'vtc') {
    const cityPart = slug.replace(/^taxi-vtc-/, '');
    return cityPart.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-');
  }
  return '';
}

// ─── Main Sync ───────────────────────────────────────────────────

async function main() {
  const db = getSupabase();

  console.log('═══════════════════════════════════════════════');
  console.log('  SYNC DATA — Supabase <-> Site Files');
  console.log('═══════════════════════════════════════════════\n');

  // ─── Part A: Files → Supabase ─────────────────────────────

  const filesToParse: Record<string, string[]> = {
    garage: [
      `${sites.garage.projectPath}/data/cities.ts`,
      `${sites.garage.projectPath}/data/services.ts`,
    ],
    vtc: [
      `${sites.vtc.projectPath}/lib/cities.tsx`,
    ],
    restaurant: [
      // Individual city page files
      ...readdirSync(`${sites.restaurant.projectPath}/data/city-pages`)
        .filter(f => f.endsWith('.ts') && f !== 'index.ts')
        .map(f => `${sites.restaurant.projectPath}/data/city-pages/${f}`),
      // Thematic pages in seo-pages.ts
      `${sites.restaurant.projectPath}/data/seo-pages.ts`,
    ],
  };

  let totalImported = 0;

  for (const [siteKey, files] of Object.entries(filesToParse)) {
    console.log(`\n── ${siteKey.toUpperCase()} — Files → Supabase ──`);

    // Get Supabase slugs
    const { data: supabaseRows } = await db
      .from('seo_pages')
      .select('slug')
      .eq('site_key', siteKey);
    const supabaseSlugs = new Set((supabaseRows || []).map((r: any) => r.slug));

    // Parse all data files
    const allFilePages: ParsedPage[] = [];
    const seenSlugs = new Set<string>();

    for (const filePath of files) {
      const parsed = parseDataFile(filePath);
      for (const p of parsed) {
        if (!seenSlugs.has(p.slug)) {
          seenSlugs.add(p.slug);
          allFilePages.push(p);
        }
      }
    }

    console.log(`  Parsed ${allFilePages.length} pages from ${files.length} files`);

    // Find file-only pages
    const fileOnly = allFilePages.filter(p => !supabaseSlugs.has(p.slug));
    console.log(`  File-only (to import): ${fileOnly.length}`);

    if (fileOnly.length === 0) {
      console.log('  Nothing to import.');
      continue;
    }

    // Import into Supabase
    let imported = 0;
    for (const page of fileOnly) {
      const pageType = inferPageType(siteKey, page.slug);
      const city = inferCity(siteKey, page.slug);

      const row: SeoPageRow = {
        site_key: siteKey,
        slug: page.slug,
        page_type: pageType,
        city: city || undefined,
        service: pageType === 'service' ? page.slug.split('-').slice(0, -1).join('-') : undefined,
        meta_title: page.metaTitle,
        meta_description: page.metaDescription,
        h1: page.h1,
        content: page.content,
        status: 'published',
      };

      try {
        await upsertSeoPage(row);
        imported++;
        console.log(`  ✅ ${page.slug}`);
      } catch (e) {
        console.log(`  ❌ ${page.slug}: ${(e as Error).message}`);
      }
    }

    totalImported += imported;
    console.log(`  Imported: ${imported}/${fileOnly.length}`);
  }

  console.log(`\nSkipping voitures — file slugs are car inventory, not SEO pages.`);

  // ─── Part B: Supabase → Files ─────────────────────────────

  console.log('\n\n── SUPABASE → FILES ──');

  for (const siteKey of ['garage', 'vtc']) {
    console.log(`\n── ${siteKey.toUpperCase()} — Supabase → Files ──`);

    // Get all Supabase pages for this site
    const { data: supabasePages } = await db
      .from('seo_pages')
      .select('*')
      .eq('site_key', siteKey);

    // Get file slugs
    const fileSlugs = new Set(getExistingSlugsFromFiles(siteKey));

    // Find Supabase-only pages
    const supabaseOnly = (supabasePages || []).filter((r: any) => !fileSlugs.has(r.slug));
    console.log(`  Supabase-only (to inject): ${supabaseOnly.length}`);

    if (supabaseOnly.length === 0) {
      console.log('  Nothing to inject.');
      continue;
    }

    try {
      const injectedSlugs = await injectPages(siteKey, supabaseOnly as SeoPageRow[]);
      console.log(`  Injected: ${injectedSlugs.length} pages into files`);
      for (const slug of injectedSlugs) {
        console.log(`  ✅ ${slug}`);
      }
    } catch (e) {
      console.log(`  ❌ Injection failed: ${(e as Error).message}`);
    }
  }

  // ─── Final Report ─────────────────────────────────────────

  console.log('\n\n═══════════════════════════════════════════════');
  console.log('  FINAL STATE');
  console.log('═══════════════════════════════════════════════\n');

  for (const siteKey of Object.keys(sites)) {
    const { count } = await db
      .from('seo_pages')
      .select('*', { count: 'exact', head: true })
      .eq('site_key', siteKey);

    const fileSlugs = getExistingSlugsFromFiles(siteKey);

    // Get actual slugs for comparison
    const { data: supabaseRows } = await db
      .from('seo_pages')
      .select('slug')
      .eq('site_key', siteKey);
    const supabaseSlugs = new Set((supabaseRows || []).map((r: any) => r.slug));
    const fileSet = new Set(fileSlugs);
    const inBoth = Array.from(supabaseSlugs).filter(s => fileSet.has(s)).length;
    const onlySupa = Array.from(supabaseSlugs).filter(s => !fileSet.has(s)).length;
    const onlyFile = fileSlugs.filter(s => !supabaseSlugs.has(s)).length;

    const status = onlySupa === 0 && onlyFile === 0 ? '✅ synced' : `⚠️  supa-only:${onlySupa} file-only:${onlyFile}`;
    console.log(`  ${siteKey.padEnd(14)} Supabase:${String(count || 0).padStart(3)}  Files:${String(fileSlugs.length).padStart(3)}  Common:${String(inBoth).padStart(3)}  ${status}`);
  }

  console.log('\nDone.');
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
