import { sites, SiteConfig, ServiceDef } from '../../config/sites.js';
import { cities66, citiesBySite, City66 } from '../../config/cities-66.js';

export interface PageToGenerate {
  siteKey: string;
  site: SiteConfig;
  pageType: 'city' | 'service' | 'city_service';
  slug: string;
  service?: ServiceDef;
  city?: City66;
}

function getCitiesForSite(siteKey: string): City66[] {
  const slugs = citiesBySite[siteKey] || [];
  return slugs
    .map(s => cities66.find(c => c.slug === s))
    .filter((c): c is City66 => c !== undefined);
}

/** Slug prefixes by site type */
const cityPrefixes: Record<string, string> = {
  garage: 'garage',
  carrosserie: 'carrossier',
  massage: 'massage-domicile',
  vtc: 'taxi-vtc',
};

/** Build the full slug for a city_service page */
function buildCityServiceSlug(siteKey: string, service: ServiceDef, city: City66): string {
  return `${service.slug}-${city.slug}`;
}

/** Build the slug for a city-only page */
function buildCitySlug(siteKey: string, city: City66): string {
  const prefix = cityPrefixes[siteKey] || siteKey;
  return `${prefix}-${city.slug}`;
}

/** Generate the full matrix of pages to create for a site */
export function generateMatrix(siteKey: string): PageToGenerate[] {
  const site = sites[siteKey];
  if (!site) throw new Error(`Unknown site: ${siteKey}`);

  const cities = getCitiesForSite(siteKey);
  const pages: PageToGenerate[] = [];

  // 1. City-only pages (for cities not yet covered)
  for (const city of cities) {
    if (city.slug === 'perpignan') continue; // Main city already has homepage
    pages.push({
      siteKey,
      site,
      pageType: 'city',
      slug: buildCitySlug(siteKey, city),
      city,
    });
  }

  // 2. City × Service combo pages (the SEO gold mine)
  for (const city of cities) {
    if (city.slug === 'perpignan') continue; // Services for Perpignan are already standalone
    for (const service of site.services) {
      pages.push({
        siteKey,
        site,
        pageType: 'city_service',
        slug: buildCityServiceSlug(siteKey, service, city),
        service,
        city,
      });
    }
  }

  return pages;
}

/** Generate matrix for all sites */
export function generateAllMatrices(): Record<string, PageToGenerate[]> {
  const result: Record<string, PageToGenerate[]> = {};
  for (const key of Object.keys(sites)) {
    result[key] = generateMatrix(key);
  }
  return result;
}

/** Get stats for all sites */
export function getMatrixStats(): Record<string, { cities: number; services: number; cityPages: number; comboPages: number; total: number }> {
  const stats: Record<string, { cities: number; services: number; cityPages: number; comboPages: number; total: number }> = {};
  for (const [key, site] of Object.entries(sites)) {
    const cities = getCitiesForSite(key).filter(c => c.slug !== 'perpignan');
    const cityPages = cities.length;
    const comboPages = cities.length * site.services.length;
    stats[key] = {
      cities: cities.length,
      services: site.services.length,
      cityPages,
      comboPages,
      total: cityPages + comboPages,
    };
  }
  return stats;
}
