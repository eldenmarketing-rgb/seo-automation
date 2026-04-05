/**
 * Universal Matrix Generator
 * 
 * Replaces city-service-matrix.ts with a mode-aware matrix.
 * Generates the list of all possible pages for any site, regardless of mode.
 * 
 * - Local mode: city × service × intent  (garage Perpignan, prix vidange Narbonne...)
 * - Thematic mode: topic × intent         (formation reprog stage 1, guide reprog...)
 * - Product mode: product × variant       (Peugeot 308, catalogue pièces...)
 */

import { sites, SiteConfig } from '../../config/sites.js';
import { cities66, citiesBySite, City66 } from '../../config/cities-66.js';
import { UniversalPage, SiteModeConfig, PageIntent } from '../../config/site-modes.js';
import { getSiteModeConfig } from '../../config/site-mode-registry.js';

// Re-export for backward compatibility with daily-generate.ts
export type PageToGenerate = UniversalPage;

// ─── Slug Builders ───────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function buildLocalSlug(citySlug: string, serviceSlug?: string, intent?: PageIntent): string {
  const parts: string[] = [];
  
  // Intent prefix for non-standard pages
  if (intent === 'prix') parts.push('prix');
  if (intent === 'urgence') parts.push('urgence');
  if (intent === 'avis') parts.push('avis');
  if (intent === 'faq') parts.push('faq');
  
  if (serviceSlug) parts.push(serviceSlug);
  parts.push(citySlug);
  
  return parts.join('-');
}

function buildThematicSlug(topicSlug: string, intent: PageIntent): string {
  if (intent === 'guide') return `guide-${topicSlug}`;
  if (intent === 'formation') return `formation-${topicSlug}`;
  if (intent === 'prix') return `prix-${topicSlug}`;
  if (intent === 'comparatif') return `comparatif-${topicSlug}`;
  if (intent === 'faq') return `faq-${topicSlug}`;
  if (intent === 'avis') return `avis-${topicSlug}`;
  return topicSlug;
}

function buildProductSlug(productSlug: string, intent: PageIntent): string {
  if (intent === 'prix') return `prix-${productSlug}`;
  if (intent === 'comparatif') return `comparatif-${productSlug}`;
  if (intent === 'avis') return `avis-${productSlug}`;
  return productSlug;
}

// ─── City Filtering (preserve citiesBySite behavior) ────────

function getCitiesForSite(siteKey: string): City66[] {
  const slugs = citiesBySite[siteKey] || [];
  if (slugs.length === 0) return cities66; // Fallback: all cities
  return slugs
    .map(s => cities66.find(c => c.slug === s))
    .filter((c): c is City66 => c !== undefined);
}

// ─── Matrix Generators ──────────────────────────────────────

function generateLocalMatrix(siteKey: string, site: SiteConfig, modeConfig: SiteModeConfig): UniversalPage[] {
  const pages: UniversalPage[] = [];
  const enabledIntents = modeConfig.enabledIntents;
  const siteCities = getCitiesForSite(siteKey);

  for (const city of siteCities) {
    // City hub page (always generated)
    if (enabledIntents.includes('city_hub')) {
      pages.push({
        siteKey,
        slug: city.slug,
        pageType: 'city',
        intent: 'city_hub',
        city: {
          name: city.name,
          slug: city.slug,
          postalCode: city.postalCode,
          distanceFromBase: city.distanceFromPerpignan,
          population: city.population,
          department: '66',
        },
        site,
        modeConfig,
      });
    }

    // City × Service pages (each service for each city)
    for (const service of (site.services || [])) {
      // Standard service page
      if (enabledIntents.includes('service')) {
        pages.push({
          siteKey,
          slug: buildLocalSlug(city.slug, service.slug),
          pageType: 'city_service',
          intent: 'service',
          city: {
            name: city.name,
            slug: city.slug,
            postalCode: city.postalCode,
            distanceFromBase: city.distanceFromPerpignan,
            population: city.population,
            department: '66',
          },
          service: {
            name: service.name,
            slug: service.slug,
            keywords: service.keywords,
          },
          site,
          modeConfig,
        });
      }

      // Intent variant pages (prix, urgence, avis, faq)
      for (const intent of enabledIntents) {
        if (['prix', 'urgence', 'avis', 'faq'].includes(intent)) {
          // Only generate intent variants for top cities (population > 5000 or within 30km)
          const isTopCity = (city.population && city.population > 5000) || 
                           city.name === 'Perpignan' ||
                           city.slug === site.city?.toLowerCase().replace(/\s+/g, '-');
          
          if (isTopCity) {
            pages.push({
              siteKey,
              slug: buildLocalSlug(city.slug, service.slug, intent as PageIntent),
              pageType: 'city_service',
              intent: intent as PageIntent,
              city: {
                name: city.name,
                slug: city.slug,
                postalCode: city.postalCode,
                distanceFromBase: city.distanceFromPerpignan,
                population: city.population,
                department: '66',
              },
              service: {
                name: service.name,
                slug: service.slug,
                keywords: service.keywords,
              },
              site,
              modeConfig,
            });
          }
        }
      }
    }
  }

  return pages;
}

function generateThematicMatrix(siteKey: string, site: SiteConfig, modeConfig: SiteModeConfig): UniversalPage[] {
  const pages: UniversalPage[] = [];
  const thematic = modeConfig.thematic!;
  const enabledIntents = modeConfig.enabledIntents;

  for (const topic of thematic.topics) {
    for (const intent of enabledIntents) {
      pages.push({
        siteKey,
        slug: buildThematicSlug(topic.slug, intent),
        pageType: intent === 'guide' || intent === 'formation' ? 'topic' : 'topic_intent',
        intent,
        topic,
        site,
        modeConfig,
      });
    }
  }

  return pages;
}

function generateProductMatrix(siteKey: string, site: SiteConfig, modeConfig: SiteModeConfig): UniversalPage[] {
  const pages: UniversalPage[] = [];
  const prodConfig = modeConfig.product!;
  const enabledIntents = modeConfig.enabledIntents;

  // Category pages
  if (enabledIntents.includes('category')) {
    pages.push({
      siteKey,
      slug: slugify(prodConfig.productType),
      pageType: 'category',
      intent: 'category',
      site,
      modeConfig,
    });
  }

  // Individual product pages
  for (const variant of prodConfig.variants) {
    for (const intent of enabledIntents) {
      if (intent === 'category') continue; // Already handled above
      
      pages.push({
        siteKey,
        slug: buildProductSlug(variant.slug, intent),
        pageType: 'product',
        intent,
        product: variant,
        site,
        modeConfig,
      });
    }
  }

  return pages;
}

// ─── Main Entry Point ────────────────────────────────────────

/**
 * Generate the full matrix of possible pages for a site.
 * Drop-in replacement for the existing generateMatrix(siteKey).
 */
export function generateMatrix(siteKey: string): UniversalPage[] {
  const site = sites[siteKey];
  if (!site) throw new Error(`Unknown site: ${siteKey}`);

  const modeConfig = getSiteModeConfig(siteKey);

  switch (modeConfig.mode) {
    case 'local':
      return generateLocalMatrix(siteKey, site, modeConfig);
    case 'thematic':
      return generateThematicMatrix(siteKey, site, modeConfig);
    case 'product':
      return generateProductMatrix(siteKey, site, modeConfig);
    default:
      throw new Error(`Unknown mode: ${modeConfig.mode} for site ${siteKey}`);
  }
}

/**
 * Get prioritized pages for a batch generation run.
 * Replaces the prioritization logic in daily-generate.ts.
 */
export function prioritizePages(pages: UniversalPage[]): UniversalPage[] {
  // Priority order:
  // 1. City hub pages (high impact, broad targeting)
  // 2. Standard service/topic pages
  // 3. Guide/formation pages (pillar content)
  // 4. Intent variants (prix, urgence, avis)
  // 5. FAQ pages
  // 6. Product pages
  // 7. Category pages

  const priorityMap: Record<string, number> = {
    city_hub: 1,
    service: 2,
    landing: 2,
    guide: 3,
    formation: 3,
    prix: 4,
    urgence: 4,
    avis: 5,
    comparatif: 5,
    faq: 6,
    product_page: 7,
    category: 8,
  };

  return [...pages].sort((a, b) => {
    const pa = priorityMap[a.intent] || 99;
    const pb = priorityMap[b.intent] || 99;
    return pa - pb;
  });
}

// ─── Backward Compatibility ────────────────────────────────

/** Generate matrix for all sites */
export function generateAllMatrices(): Record<string, UniversalPage[]> {
  const result: Record<string, UniversalPage[]> = {};
  for (const key of Object.keys(sites)) {
    result[key] = generateMatrix(key);
  }
  return result;
}

/** Get stats for all sites — backward compatible with city-service-matrix.ts */
export function getMatrixStats(): Record<string, { cities: number; services: number; cityPages: number; comboPages: number; total: number }> {
  const stats: Record<string, { cities: number; services: number; cityPages: number; comboPages: number; total: number }> = {};
  for (const [key, site] of Object.entries(sites)) {
    const modeConfig = getSiteModeConfig(key);
    if (modeConfig.mode === 'local') {
      const siteCities = getCitiesForSite(key).filter(c => c.slug !== 'perpignan');
      const cityPages = siteCities.length;
      const comboPages = siteCities.length * site.services.length;
      // Count intent variant pages for top cities
      const intentVariants = modeConfig.enabledIntents.filter(i => ['prix', 'urgence', 'avis', 'faq'].includes(i));
      const topCities = siteCities.filter(c => (c.population && c.population > 5000) || c.name === 'Perpignan');
      const intentPages = topCities.length * site.services.length * intentVariants.length;
      stats[key] = {
        cities: siteCities.length,
        services: site.services.length,
        cityPages,
        comboPages,
        total: cityPages + comboPages + intentPages,
      };
    } else if (modeConfig.mode === 'thematic') {
      const topics = modeConfig.thematic?.topics.length || 0;
      const intents = modeConfig.enabledIntents.length;
      stats[key] = { cities: 0, services: topics, cityPages: 0, comboPages: topics * intents, total: topics * intents };
    } else if (modeConfig.mode === 'product') {
      const variants = modeConfig.product?.variants.length || 0;
      const intents = modeConfig.enabledIntents.length;
      stats[key] = { cities: 0, services: variants, cityPages: 0, comboPages: variants * intents, total: variants * intents + 1 };
    } else {
      stats[key] = { cities: 0, services: 0, cityPages: 0, comboPages: 0, total: 0 };
    }
  }
  return stats;
}
