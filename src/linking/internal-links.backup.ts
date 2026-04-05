import { cities66, citiesBySite, City66 } from '../../config/cities-66.js';
import { sites, ServiceDef } from '../../config/sites.js';
import { getExistingSlugsFromFiles } from '../deployers/inject-pages.js';

export interface InternalLink {
  slug: string;
  label: string;
  type: 'city' | 'service' | 'city_service';
}

// Zone proximity order for finding nearby cities
const zoneOrder: Record<string, number> = {
  perpignan: 0,
  proche: 1,
  peripherie: 2,
  eloigne: 3,
};

/**
 * Get nearby cities for a given city based on zone proximity.
 * Returns cities in the same or adjacent zones.
 */
export function getNearbyCities(citySlug: string, siteKey: string, limit = 5): City66[] {
  const siteCitySlugs = citiesBySite[siteKey] || [];
  const siteCities = siteCitySlugs
    .map(s => cities66.find(c => c.slug === s))
    .filter((c): c is City66 => c !== undefined);

  const targetCity = cities66.find(c => c.slug === citySlug);
  if (!targetCity) return siteCities.slice(0, limit);

  const targetZone = zoneOrder[targetCity.zone] ?? 1;

  // Sort by zone proximity to target city
  return siteCities
    .filter(c => c.slug !== citySlug && c.slug !== 'perpignan')
    .sort((a, b) => {
      const aDist = Math.abs(zoneOrder[a.zone] - targetZone);
      const bDist = Math.abs(zoneOrder[b.zone] - targetZone);
      if (aDist !== bDist) return aDist - bDist;
      return b.population - a.population; // Higher population first
    })
    .slice(0, limit);
}

/**
 * Get related services for a given service based on category.
 */
export function getRelatedServices(serviceSlug: string, siteKey: string, limit = 4): ServiceDef[] {
  const site = sites[siteKey];
  if (!site) return [];

  const targetService = site.services.find(s => s.slug === serviceSlug);
  if (!targetService) return site.services.slice(0, limit);

  // Same category first, then other categories
  return site.services
    .filter(s => s.slug !== serviceSlug)
    .sort((a, b) => {
      const aMatch = a.category === targetService.category ? 0 : 1;
      const bMatch = b.category === targetService.category ? 0 : 1;
      return aMatch - bMatch;
    })
    .slice(0, limit);
}

// Slug prefix per site for city pages
const cityPrefixes: Record<string, string> = {
  garage: 'garage',
  carrosserie: 'carrossier',
  massage: 'massage-domicile',
  vtc: 'taxi-vtc',
  voitures: 'voiture-occasion',
};

/**
 * Build internal links for a city×service page.
 * Links to: same service in nearby cities + other services in same city.
 */
export function getLinksForCityServicePage(
  siteKey: string,
  citySlug: string,
  serviceSlug: string,
): InternalLink[] {
  const links: InternalLink[] = [];
  const existingSlugs = new Set(getExistingSlugsFromFiles(siteKey));
  const prefix = cityPrefixes[siteKey] || siteKey;

  // 1. Same service in nearby cities
  const nearbyCities = getNearbyCities(citySlug, siteKey, 3);
  for (const city of nearbyCities) {
    const slug = `${serviceSlug}-${city.slug}`;
    if (existingSlugs.has(slug)) {
      const service = sites[siteKey]?.services.find(s => s.slug === serviceSlug);
      links.push({
        slug,
        label: `${service?.name || serviceSlug} à ${city.name}`,
        type: 'city_service',
      });
    }
  }

  // 2. Other services in same city
  const relatedServices = getRelatedServices(serviceSlug, siteKey, 3);
  for (const svc of relatedServices) {
    const slug = `${svc.slug}-${citySlug}`;
    if (existingSlugs.has(slug)) {
      const city = cities66.find(c => c.slug === citySlug);
      links.push({
        slug,
        label: `${svc.name} à ${city?.name || citySlug}`,
        type: 'city_service',
      });
    }
  }

  // 3. City page itself
  const cityPageSlug = `${prefix}-${citySlug}`;
  if (existingSlugs.has(cityPageSlug)) {
    const city = cities66.find(c => c.slug === citySlug);
    links.push({
      slug: cityPageSlug,
      label: `${sites[siteKey]?.name} à ${city?.name || citySlug}`,
      type: 'city',
    });
  }

  return links.slice(0, 6);
}

/**
 * Build internal links for a city-only page.
 * Links to: services in this city + nearby city pages.
 */
export function getLinksForCityPage(
  siteKey: string,
  citySlug: string,
): InternalLink[] {
  const links: InternalLink[] = [];
  const existingSlugs = new Set(getExistingSlugsFromFiles(siteKey));
  const prefix = cityPrefixes[siteKey] || siteKey;
  const site = sites[siteKey];
  if (!site) return [];

  // 1. Top services in this city (by category variety)
  const seenCategories = new Set<string>();
  for (const svc of site.services) {
    if (seenCategories.size >= 4) break;
    const slug = `${svc.slug}-${citySlug}`;
    if (existingSlugs.has(slug) && !seenCategories.has(svc.category)) {
      seenCategories.add(svc.category);
      const city = cities66.find(c => c.slug === citySlug);
      links.push({
        slug,
        label: `${svc.name} à ${city?.name || citySlug}`,
        type: 'city_service',
      });
    }
  }

  // 2. Nearby city pages
  const nearbyCities = getNearbyCities(citySlug, siteKey, 4);
  for (const city of nearbyCities) {
    const slug = `${prefix}-${city.slug}`;
    if (existingSlugs.has(slug)) {
      links.push({
        slug,
        label: `${site.name} à ${city.name}`,
        type: 'city',
      });
    }
  }

  return links.slice(0, 6);
}

/**
 * Format links as a string for Claude prompt injection.
 * Provides real existing page slugs that Claude can reference.
 */
export function formatLinksForPrompt(links: InternalLink[], domain: string): string {
  if (links.length === 0) return 'Aucun lien interne disponible pour le moment.';

  return links
    .map(l => `- "${l.label}" → ${domain}/${l.slug}`)
    .join('\n');
}
