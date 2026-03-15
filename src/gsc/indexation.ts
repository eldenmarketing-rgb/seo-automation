import { fetchGscData } from './client.js';
import { getSupabase } from '../db/supabase.js';
import { getExistingSlugsFromFiles } from '../deployers/inject-pages.js';
import { sites } from '../../config/sites.js';
import * as logger from '../utils/logger.js';

export interface IndexationReport {
  totalPages: number;
  indexedPages: number;
  notIndexedPages: string[];
  lowImpressionPages: Array<{ slug: string; impressions: number }>;
}

export async function checkIndexation(siteKey: string): Promise<IndexationReport> {
  const site = sites[siteKey];
  if (!site) throw new Error(`Unknown site: ${siteKey}`);

  const db = getSupabase();

  // Get all pages from both Supabase AND site data files
  const { data: seoPages } = await db
    .from('seo_pages')
    .select('slug')
    .eq('site_key', siteKey)
    .in('status', ['published', 'draft', 'optimized']);

  const dbSlugs = (seoPages || []).map((p: { slug: string }) => p.slug);
  const fileSlugs = getExistingSlugsFromFiles(siteKey);
  const allSlugs = [...new Set([...dbSlugs, ...fileSlugs])];

  // Get GSC data (pages that have impressions = indexed)
  const gscRows = await fetchGscData(siteKey, 28);

  // Extract unique page URLs from GSC
  const indexedUrls = new Set<string>();
  const pageImpressions = new Map<string, number>();

  for (const row of gscRows) {
    indexedUrls.add(row.page_url);
    const current = pageImpressions.get(row.page_url) || 0;
    pageImpressions.set(row.page_url, current + row.impressions);
  }

  // Find slugs that appear in GSC
  const indexedSlugs = new Set<string>();
  for (const url of indexedUrls) {
    const slug = url.split('/').pop() || '';
    if (slug) indexedSlugs.add(slug);
  }

  // Pages not found in GSC = probably not indexed
  const notIndexedPages = allSlugs.filter(slug => !indexedSlugs.has(slug));

  // Pages with very low impressions
  const lowImpressionPages: Array<{ slug: string; impressions: number }> = [];
  for (const [url, impressions] of pageImpressions) {
    const slug = url.split('/').pop() || '';
    if (impressions < 5 && slug) {
      lowImpressionPages.push({ slug, impressions });
    }
  }

  logger.info(`Indexation ${siteKey}: ${indexedSlugs.size}/${allSlugs.length} indexed, ${notIndexedPages.length} missing`);

  return {
    totalPages: allSlugs.length,
    indexedPages: indexedSlugs.size,
    notIndexedPages,
    lowImpressionPages: lowImpressionPages.sort((a, b) => a.impressions - b.impressions),
  };
}
