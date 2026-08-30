/**
 * Inventaire d'un domaine tiers : robots.txt → sitemaps déclarés → URL.
 * Réutilise le crawler (mêmes règles que pour nos propres sites). Le sitemap
 * dit ce qu'un concurrent PUBLIE, pas ce qui ranke — il sert à l'inventaire
 * (pages de confiance) et à la veille (nouveautés), jamais seul au verdict.
 */
import { sitemapUrls } from '../crawler/index.js';
import { loadRobots } from '../crawler/robots.js';

export const SITEMAP_MAX_URLS = 500;

const NOT_A_PAGE =
  /\.(jpg|jpeg|png|gif|webp|avif|svg|ico|css|js|mjs|json|xml|txt|pdf|zip|mp4|webm|woff2?|ttf)$/i;

export async function fetchSitemap(domain: string): Promise<{ reached: boolean; urls: string[] }> {
  // Certains sites ne répondent que sur www : on essaie l'apex puis www.
  for (const origin of [`https://${domain}`, `https://www.${domain}`]) {
    const robots = await loadRobots(origin);
    const res = await sitemapUrls(origin, robots.sitemaps);
    if (res.sources.length === 0) continue;
    const urls = [...res.urls].filter((u) => !NOT_A_PAGE.test(u)).slice(0, SITEMAP_MAX_URLS);
    return { reached: true, urls };
  }
  return { reached: false, urls: [] };
}
