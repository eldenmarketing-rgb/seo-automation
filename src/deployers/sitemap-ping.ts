import { sites } from '../../config/sites.js';
import * as logger from '../utils/logger.js';

export async function pingSitemap(siteKey: string): Promise<boolean> {
  const site = sites[siteKey];
  if (!site) return false;

  const sitemapUrl = `${site.domain}/sitemap.xml`;
  const pingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;

  try {
    const res = await fetch(pingUrl);
    logger.success(`Sitemap ping for ${siteKey}: ${res.status}`);
    return res.ok;
  } catch (e) {
    logger.error(`Sitemap ping failed for ${siteKey}: ${(e as Error).message}`);
    return false;
  }
}
