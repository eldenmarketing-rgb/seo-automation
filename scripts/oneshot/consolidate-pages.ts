/**
 * consolidate-pages.ts
 *
 * Analyzes city x service page combinations in Supabase and generates
 * consolidation recommendations. Instead of 42 city pages per service,
 * keep 1 strong service page with a "Zones desservies" section.
 *
 * Data patterns found in Supabase:
 *   - City pages (page_type='city', service=null): "garage-{city}", "carrossier-{city}"
 *   - Service pages (page_type='service'|'city_service'): "vidange-perpignan", "peinture-auto/perpignan"
 *   - Some city pages have no prefix: "perpignan", "cabestany" (standalone city pages)
 *
 * The script groups city pages by their slug prefix and consolidates them
 * into one winner page (Perpignan or the main page) with a "Zones desservies" section.
 *
 * Usage:
 *   npx tsx scripts/consolidate-pages.ts [--site garage|carrosserie] [--apply]
 *
 * Flags:
 *   --site <key>   Target site (default: both garage and carrosserie)
 *   --apply        Actually update Supabase and generate next.config redirect block
 */

import dotenv from 'dotenv';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import { getSupabase, type SeoPageRow } from '../src/db/supabase.js';
import { cities66, citiesBySite, type City66 } from '../config/cities-66.js';
import { sites } from '../config/sites.js';

dotenv.config();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RedirectEntry {
  source: string;
  destination: string;
  permanent: boolean;
}

interface RedirectPage {
  slug: string;
  city: string;
  page_id: string;
  status: string;
}

interface ConsolidationGroup {
  service: string;
  service_name: string;
  winner_slug: string;
  winner_page_id: string;
  winner_status: string;
  redirect_pages: RedirectPage[];
  zones_section: string;
  redirects: RedirectEntry[];
}

interface ConsolidationReport {
  site_key: string;
  site_domain: string;
  total_pages: number;
  pages_kept: number;
  consolidation_groups: ConsolidationGroup[];
  total_redirects: number;
  generated_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const cityBySlug = new Map<string, City66>();
const cityByNameLower = new Map<string, City66>();
for (const c of cities66) {
  cityBySlug.set(c.slug, c);
  cityByNameLower.set(c.name.toLowerCase(), c);
}

/**
 * Resolve a City66 from either the page's city field or from its slug suffix.
 */
function resolveCity(page: SeoPageRow): City66 | undefined {
  // Try city field first (exact name match)
  if (page.city) {
    const byName = cityByNameLower.get(page.city.toLowerCase());
    if (byName) return byName;
    // City field might be a slug-like value (e.g. "Cabestany")
    const bySlug = cityBySlug.get(page.city.toLowerCase());
    if (bySlug) return bySlug;
  }
  // Try extracting from slug suffix (longest match first)
  const sortedCities = [...cities66].sort((a, b) => b.slug.length - a.slug.length);
  for (const city of sortedCities) {
    if (page.slug.endsWith(`-${city.slug}`) || page.slug === city.slug) {
      return city;
    }
  }
  return undefined;
}

/**
 * Detect the slug prefix for a city page.
 * e.g. "garage-cabestany" -> "garage", "carrossier-bompas" -> "carrossier"
 * Returns undefined for bare city slugs like "perpignan", "cabestany".
 */
function detectCityPagePrefix(slug: string): string | undefined {
  for (const city of cities66) {
    if (slug.endsWith(`-${city.slug}`)) {
      const prefix = slug.slice(0, -(city.slug.length + 1));
      if (prefix.length > 0) return prefix;
    }
  }
  return undefined;
}

/**
 * Build a "Zones desservies" section listing all served cities with distances.
 */
function buildZonesSection(allCities: City66[]): string {
  const zoneOrder: Record<string, number> = { perpignan: 0, proche: 1, peripherie: 2, eloigne: 3 };
  const sorted = [...allCities].sort((a, b) => {
    const za = zoneOrder[a.zone] ?? 99;
    const zb = zoneOrder[b.zone] ?? 99;
    if (za !== zb) return za - zb;
    return a.name.localeCompare(b.name, 'fr');
  });

  const parts = sorted.map(c => {
    if (c.zone === 'perpignan') return c.name;
    return `${c.name} (${c.distanceFromPerpignan})`;
  });

  return `Nous intervenons a ${parts.join(', ')}.`;
}

/**
 * Build a comprehensive zones section using all known cities for a site,
 * not just the ones that have existing pages.
 */
function buildFullZonesSection(siteKey: string, existingCities: City66[]): string {
  // Start with existing page cities
  const citySet = new Map<string, City66>();
  for (const c of existingCities) citySet.set(c.slug, c);

  // Add all cities configured for this site in cities-66.ts
  const siteCitySlugs = citiesBySite[siteKey] || [];
  for (const slug of siteCitySlugs) {
    if (!citySet.has(slug)) {
      const city = cityBySlug.get(slug);
      if (city) citySet.set(slug, city);
    }
  }

  return buildZonesSection(Array.from(citySet.values()));
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

async function analyzeSite(siteKey: string): Promise<ConsolidationReport> {
  const siteConfig = sites[siteKey];
  if (!siteConfig) throw new Error(`Unknown site_key: ${siteKey}`);

  const db = getSupabase();

  // Fetch all seo_pages for this site
  const { data: allPages, error } = await db
    .from('seo_pages')
    .select('*')
    .eq('site_key', siteKey)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch pages for ${siteKey}: ${error.message}`);
  const pages = (allPages || []) as SeoPageRow[];

  console.log(`\n--- ${siteConfig.name} (${siteKey}) ---`);
  console.log(`Total pages in Supabase: ${pages.length}`);

  // Separate pages by type
  const cityPages = pages.filter(p => p.page_type === 'city');
  const servicePages = pages.filter(p => p.page_type === 'service' || p.page_type === 'city_service');
  const otherPages = pages.filter(p => p.page_type !== 'city' && p.page_type !== 'service' && p.page_type !== 'city_service');

  console.log(`  City pages: ${cityPages.length}`);
  console.log(`  Service pages: ${servicePages.length}`);
  console.log(`  Other pages: ${otherPages.length}`);

  const consolidationGroups: ConsolidationGroup[] = [];

  // === Strategy 1: Group city pages by prefix ===
  // e.g. all "garage-{city}" pages form one group, all "carrossier-{city}" pages form another
  const cityPagesByPrefix = new Map<string, SeoPageRow[]>();
  const bareCityPages: SeoPageRow[] = []; // Pages like "perpignan", "cabestany" with no prefix

  for (const page of cityPages) {
    const prefix = detectCityPagePrefix(page.slug);
    if (prefix) {
      const group = cityPagesByPrefix.get(prefix) || [];
      group.push(page);
      cityPagesByPrefix.set(prefix, group);
    } else {
      bareCityPages.push(page);
    }
  }

  // Process prefixed city page groups (e.g. "garage-*", "carrossier-*")
  for (const [prefix, groupPages] of cityPagesByPrefix.entries()) {
    if (groupPages.length < 2 && bareCityPages.length === 0) continue;

    // Include bare city pages in the group (they target same intent without prefix)
    const allGroupPages = [...groupPages, ...bareCityPages];

    // Find the winner: Perpignan page or best-status page
    let winner: SeoPageRow | undefined;
    let winnerIsFromServicePages = false;

    // First try: the prefixed Perpignan page (e.g. "garage-perpignan")
    const perpignanPrefixed = groupPages.find(p => p.slug === `${prefix}-perpignan`);
    // Second try: bare "perpignan" city page
    const perpignanBare = bareCityPages.find(p => p.slug === 'perpignan');

    if (perpignanPrefixed) {
      winner = perpignanPrefixed;
    } else if (perpignanBare) {
      winner = perpignanBare;
    }

    // If no city page for Perpignan, look for a main service page to redirect to
    // e.g. for carrosserie: redirect carrossier-* city pages to "carrosserie/perpignan" or similar
    if (!winner) {
      // Find a Perpignan service page that matches the prefix concept
      // e.g. prefix "carrossier" should match service page "carrosserie/perpignan"
      const prefixRoot = prefix.replace(/i?er$/, '').replace(/ie$/, ''); // "carrossier" -> "carross"
      const matchingServicePages = servicePages.filter(p => {
        const city = resolveCity(p);
        if (city?.zone !== 'perpignan') return false;
        const slug = p.slug.replace(/\//g, '-').toLowerCase();
        return slug.startsWith(prefix) || slug.startsWith(prefixRoot) || prefix.startsWith(slug.split(/[-/]/)[0] || '');
      });
      // Prefer the shortest slug (most generic/main page)
      matchingServicePages.sort((a, b) => a.slug.length - b.slug.length);
      const perpignanServicePage = matchingServicePages[0];
      if (perpignanServicePage) {
        winner = perpignanServicePage;
        winnerIsFromServicePages = true;
      }
    }

    // Last resort: pick the best city page by status
    if (!winner) {
      const sorted = [...allGroupPages].sort((a, b) => {
        const statusPriority: Record<string, number> = { published: 0, optimized: 1, draft: 2 };
        const sa = statusPriority[a.status || ''] ?? 3;
        const sb = statusPriority[b.status || ''] ?? 3;
        if (sa !== sb) return sa - sb;
        const aPerpignan = a.slug.includes('perpignan') ? 0 : 1;
        const bPerpignan = b.slug.includes('perpignan') ? 0 : 1;
        return aPerpignan - bPerpignan;
      });
      winner = sorted[0];
    }

    // All other pages in this group become redirect candidates
    const redirectCandidates = allGroupPages.filter(p => p.slug !== winner!.slug);
    if (redirectCandidates.length === 0) continue;

    // Collect cities from all pages in the group
    const citiesInGroup: City66[] = [];
    for (const page of allGroupPages) {
      const city = resolveCity(page);
      if (city && !citiesInGroup.find(c => c.slug === city.slug)) {
        citiesInGroup.push(city);
      }
    }

    const zonesSection = buildFullZonesSection(siteKey, citiesInGroup);

    const redirectPages: RedirectPage[] = redirectCandidates.map(p => {
      const city = resolveCity(p);
      return {
        slug: p.slug,
        city: city?.name || p.city || 'Unknown',
        page_id: p.id || '',
        status: p.status || 'unknown',
      };
    });

    const redirects: RedirectEntry[] = redirectCandidates.map(p => ({
      source: `/${p.slug}`,
      destination: `/${winner!.slug}`,
      permanent: true,
    }));

    // Determine a human-readable name for this group
    const serviceName = prefix.charAt(0).toUpperCase() + prefix.slice(1).replace(/-/g, ' ');

    consolidationGroups.push({
      service: prefix,
      service_name: `${serviceName} (city pages)`,
      winner_slug: winner.slug,
      winner_page_id: winner.id || '',
      winner_status: winner.status || 'unknown',
      redirect_pages: redirectPages,
      zones_section: zonesSection,
      redirects,
    });
  }

  // === Strategy 2: Group service/city_service pages by service slug ===
  // e.g. multiple "vidange-{city}" pages across different cities
  const servicesBySlug = new Map<string, SeoPageRow[]>();
  const serviceSlugs = siteConfig.services.map(s => s.slug);

  for (const page of servicePages) {
    // Normalize: use the service field if available, otherwise extract from slug
    let serviceSlug = page.service;

    // Normalize service field: some have full name (e.g. "Vidange") vs slug (e.g. "vidange")
    if (serviceSlug) {
      // Find matching service definition
      const matchBySlug = siteConfig.services.find(s => s.slug === serviceSlug);
      const matchByName = siteConfig.services.find(s => s.name === serviceSlug);
      if (matchBySlug) serviceSlug = matchBySlug.slug;
      else if (matchByName) serviceSlug = matchByName.slug;
      else {
        // Service slug might include city suffix (e.g. "covering-wrapping-perpignan")
        for (const svc of serviceSlugs) {
          if (serviceSlug!.startsWith(svc)) {
            serviceSlug = svc;
            break;
          }
        }
      }
    }

    if (!serviceSlug) {
      // Try to extract from slug
      const sortedSvc = [...serviceSlugs].sort((a, b) => b.length - a.length);
      for (const svc of sortedSvc) {
        if (page.slug === svc || page.slug.startsWith(`${svc}-`) || page.slug.startsWith(`${svc}/`)) {
          serviceSlug = svc;
          break;
        }
      }
    }

    if (!serviceSlug) continue;

    const group = servicesBySlug.get(serviceSlug) || [];
    group.push(page);
    servicesBySlug.set(serviceSlug, group);
  }

  for (const [serviceSlug, groupPages] of servicesBySlug.entries()) {
    if (groupPages.length < 2) continue;

    // Find the Perpignan variant as winner
    let winner: SeoPageRow | undefined;
    const perpignanPage = groupPages.find(p => {
      const city = resolveCity(p);
      return city?.zone === 'perpignan';
    });

    if (perpignanPage) {
      winner = perpignanPage;
    } else {
      // Pick best status page
      const sorted = [...groupPages].sort((a, b) => {
        const sp: Record<string, number> = { published: 0, optimized: 1, draft: 2 };
        return (sp[a.status || ''] ?? 3) - (sp[b.status || ''] ?? 3);
      });
      winner = sorted[0];
    }

    const redirectCandidates = groupPages.filter(p => p.slug !== winner!.slug);
    if (redirectCandidates.length === 0) continue;

    const citiesInGroup: City66[] = [];
    for (const page of groupPages) {
      const city = resolveCity(page);
      if (city && !citiesInGroup.find(c => c.slug === city.slug)) {
        citiesInGroup.push(city);
      }
    }

    const zonesSection = buildFullZonesSection(siteKey, citiesInGroup);
    const svcDef = siteConfig.services.find(s => s.slug === serviceSlug);

    const redirectPages: RedirectPage[] = redirectCandidates.map(p => {
      const city = resolveCity(p);
      return {
        slug: p.slug,
        city: city?.name || p.city || 'Unknown',
        page_id: p.id || '',
        status: p.status || 'unknown',
      };
    });

    const redirects: RedirectEntry[] = redirectCandidates.map(p => ({
      source: `/${p.slug}`,
      destination: `/${winner!.slug}`,
      permanent: true,
    }));

    consolidationGroups.push({
      service: serviceSlug,
      service_name: svcDef?.name || serviceSlug,
      winner_slug: winner.slug,
      winner_page_id: winner.id || '',
      winner_status: winner.status || 'unknown',
      redirect_pages: redirectPages,
      zones_section: zonesSection,
      redirects,
    });
  }

  // Sort groups by number of redirects (most impactful first)
  consolidationGroups.sort((a, b) => b.redirect_pages.length - a.redirect_pages.length);

  const totalRedirects = consolidationGroups.reduce((sum, g) => sum + g.redirects.length, 0);

  console.log(`Consolidation groups: ${consolidationGroups.length}`);
  console.log(`Total redirects needed: ${totalRedirects}`);
  console.log(`Pages kept: ${pages.length - totalRedirects}`);

  for (const g of consolidationGroups) {
    console.log(`  ${g.service_name}: ${g.winner_slug} (winner) + ${g.redirect_pages.length} redirects`);
  }

  return {
    site_key: siteKey,
    site_domain: siteConfig.domain,
    total_pages: pages.length,
    pages_kept: pages.length - totalRedirects,
    consolidation_groups: consolidationGroups,
    total_redirects: totalRedirects,
    generated_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------

async function applyConsolidation(report: ConsolidationReport): Promise<void> {
  const db = getSupabase();

  console.log(`\n=== APPLYING consolidation for ${report.site_key} ===`);

  for (const group of report.consolidation_groups) {
    // 1. Update winner page content to add zones section
    if (group.winner_page_id) {
      const { data: winnerPage, error: fetchErr } = await db
        .from('seo_pages')
        .select('content')
        .eq('id', group.winner_page_id)
        .single();

      if (!fetchErr && winnerPage) {
        const content = (winnerPage.content || {}) as Record<string, unknown>;
        content.zones_desservies = group.zones_section;
        content.consolidated = true;
        content.consolidated_at = new Date().toISOString();
        content.redirect_count = group.redirect_pages.length;

        const { error: updateErr } = await db
          .from('seo_pages')
          .update({ content, updated_at: new Date().toISOString() })
          .eq('id', group.winner_page_id);

        if (updateErr) {
          console.error(`  Failed to update winner ${group.winner_slug}: ${updateErr.message}`);
        } else {
          console.log(`  Updated winner: ${group.winner_slug} (added zones_desservies)`);
        }
      }
    }

    // 2. Mark redirect pages as 'redirected'
    for (const rp of group.redirect_pages) {
      if (!rp.page_id) continue;
      const { error: markErr } = await db
        .from('seo_pages')
        .update({
          status: 'redirected',
          content: {
            redirected_to: group.winner_slug,
            redirected_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', rp.page_id);

      if (markErr) {
        console.error(`  Failed to mark ${rp.slug} as redirected: ${markErr.message}`);
      }
    }

    console.log(`  Marked ${group.redirect_pages.length} pages as redirected for ${group.service}`);
  }

  // 3. Generate next.config.ts redirect block
  const allRedirects = report.consolidation_groups.flatMap(g => g.redirects);
  const nextConfigBlock = generateNextConfigRedirects(allRedirects, report.site_key);

  const redirectFilePath = path.join(
    process.cwd(),
    'reports',
    `next-config-redirects-${report.site_key}.ts`
  );
  writeFileSync(redirectFilePath, nextConfigBlock, 'utf-8');
  console.log(`\nGenerated next.config redirect block: ${redirectFilePath}`);
  console.log(`Total redirects written: ${allRedirects.length}`);
}

function generateNextConfigRedirects(redirects: RedirectEntry[], siteKey: string): string {
  const entries = redirects
    .map(r => `    { source: '${r.source}', destination: '${r.destination}', permanent: ${r.permanent} },`)
    .join('\n');

  return `// Auto-generated by consolidate-pages.ts
// Copy this into next.config.ts > redirects()
// Site: ${siteKey}
// Generated: ${new Date().toISOString()}

export const consolidationRedirects = [
${entries}
];

// Usage in next.config.ts:
//
// import { consolidationRedirects } from '../seo-automation/reports/next-config-redirects-${siteKey}';
//
// const nextConfig = {
//   async redirects() {
//     return [
//       ...consolidationRedirects,
//       // ... other redirects
//     ];
//   },
// };
`;
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const siteFlag = args.indexOf('--site');
  const applyMode = args.includes('--apply');

  let targetSites: string[];
  if (siteFlag >= 0 && args[siteFlag + 1]) {
    const siteArg = args[siteFlag + 1];
    if (!sites[siteArg]) {
      console.error(`Unknown site: ${siteArg}. Available: ${Object.keys(sites).join(', ')}`);
      process.exit(1);
    }
    targetSites = [siteArg];
  } else {
    targetSites = ['garage', 'carrosserie'];
  }

  console.log(`Consolidation analysis for: ${targetSites.join(', ')}`);
  console.log(`Mode: ${applyMode ? 'APPLY (will modify Supabase)' : 'DRY RUN (report only)'}`);
  console.log('');

  // Ensure reports directory exists
  const reportsDir = path.join(process.cwd(), 'reports');
  if (!existsSync(reportsDir)) {
    mkdirSync(reportsDir, { recursive: true });
  }

  const reports: ConsolidationReport[] = [];

  for (const siteKey of targetSites) {
    try {
      const report = await analyzeSite(siteKey);
      reports.push(report);

      // Write individual report
      const reportPath = path.join(reportsDir, `consolidation-report-${siteKey}.json`);
      writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
      console.log(`Report written: ${reportPath}`);

      if (applyMode && report.total_redirects > 0) {
        await applyConsolidation(report);
      }
    } catch (err) {
      console.error(`Error analyzing ${siteKey}:`, err);
    }
  }

  // Write combined report
  if (reports.length > 0) {
    const combinedPath = path.join(reportsDir, 'consolidation-report.json');
    const combined = reports.length === 1
      ? reports[0]
      : {
          sites: reports.map(r => r.site_key),
          reports,
          total_redirects: reports.reduce((s, r) => s + r.total_redirects, 0),
          generated_at: new Date().toISOString(),
        };
    writeFileSync(combinedPath, JSON.stringify(combined, null, 2), 'utf-8');
    console.log(`\nCombined report: ${combinedPath}`);
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  for (const r of reports) {
    console.log(`${r.site_key}: ${r.total_pages} pages -> ${r.pages_kept} kept, ${r.total_redirects} redirects`);
    for (const g of r.consolidation_groups) {
      console.log(`  ${g.service_name}: keep /${g.winner_slug}, redirect ${g.redirect_pages.length} city variants`);
    }
  }

  if (!applyMode && reports.some(r => r.total_redirects > 0)) {
    console.log('\nTo apply changes, re-run with --apply flag:');
    console.log('  npx tsx scripts/consolidate-pages.ts --apply');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
