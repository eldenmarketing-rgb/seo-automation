import { getSupabase, addToOptimizationQueue, OptimizationQueueRow } from '../db/supabase.js';
import { sites } from '../../config/sites.js';
import * as logger from '../utils/logger.js';

interface CandidateRow {
  page_url: string;
  avg_position: number;
  total_impressions: number;
  total_clicks: number;
  queries: Array<{ query: string; position: number; impressions: number }>;
}

/**
 * Find pages ranking between position #5 and #15 — high optimization potential.
 * These pages are close to top positions and can benefit from content improvements.
 */
export async function findOptimizationCandidates(siteKey: string): Promise<CandidateRow[]> {
  const site = sites[siteKey];
  if (!site) throw new Error(`Unknown site: ${siteKey}`);

  const db = getSupabase();

  // Get pages with avg position between 5 and 15 in the last 28 days
  const { data, error } = await db.rpc('get_optimization_candidates', { site_key_param: siteKey });

  // If the RPC doesn't exist, fall back to a direct query
  if (error) {
    logger.warn(`RPC fallback for ${siteKey}: using direct query`);
    return findCandidatesDirect(siteKey);
  }

  return data || [];
}

async function findCandidatesDirect(siteKey: string): Promise<CandidateRow[]> {
  const db = getSupabase();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 28);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  // Get all positions for this site in the last 28 days
  const { data: positions, error } = await db
    .from('gsc_positions')
    .select('page_url, query, position, impressions, clicks')
    .eq('site_key', siteKey)
    .gte('date', cutoffStr);

  if (error) throw new Error(`Query failed: ${error.message}`);
  if (!positions || positions.length === 0) return [];

  // Group by page_url
  const byPage = new Map<string, {
    positions: number[];
    impressions: number;
    clicks: number;
    queries: Array<{ query: string; position: number; impressions: number }>;
  }>();

  for (const row of positions) {
    const existing = byPage.get(row.page_url) || {
      positions: [],
      impressions: 0,
      clicks: 0,
      queries: [],
    };
    existing.positions.push(row.position);
    existing.impressions += row.impressions;
    existing.clicks += row.clicks;
    existing.queries.push({
      query: row.query,
      position: row.position,
      impressions: row.impressions,
    });
    byPage.set(row.page_url, existing);
  }

  // Filter for pages with avg position between 5 and 15
  const candidates: CandidateRow[] = [];
  for (const [pageUrl, data] of byPage) {
    const avg = data.positions.reduce((a, b) => a + b, 0) / data.positions.length;
    if (avg >= 5 && avg <= 15) {
      // Sort queries by impressions desc, keep top 10
      const topQueries = data.queries
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 10);

      candidates.push({
        page_url: pageUrl,
        avg_position: Math.round(avg * 10) / 10,
        total_impressions: data.impressions,
        total_clicks: data.clicks,
        queries: topQueries,
      });
    }
  }

  // Sort by impressions (highest potential first)
  candidates.sort((a, b) => b.total_impressions - a.total_impressions);

  logger.info(`Found ${candidates.length} optimization candidates for ${siteKey}`);
  return candidates;
}

/**
 * Add candidates to the optimization queue.
 * Skips pages that are already pending.
 */
export async function queueCandidates(siteKey: string, candidates: CandidateRow[]): Promise<number> {
  const db = getSupabase();
  let queued = 0;

  // Get already pending URLs
  const { data: existing } = await db
    .from('optimization_queue')
    .select('page_url')
    .eq('site_key', siteKey)
    .in('status', ['pending', 'optimizing']);

  const existingUrls = new Set((existing || []).map((r: { page_url: string }) => r.page_url));

  // Find matching seo_pages for content
  const { data: seoPages } = await db
    .from('seo_pages')
    .select('id, slug, content')
    .eq('site_key', siteKey);

  const seoPageMap = new Map(
    (seoPages || []).map((p: { id: string; slug: string; content: Record<string, unknown> }) => [p.slug, p])
  );

  for (const candidate of candidates) {
    if (existingUrls.has(candidate.page_url)) continue;

    // Try to match with a seo_page
    const slug = candidate.page_url.split('/').pop() || '';
    const seoPage = seoPageMap.get(slug);

    const row: OptimizationQueueRow = {
      seo_page_id: seoPage?.id,
      site_key: siteKey,
      page_url: candidate.page_url,
      avg_position: candidate.avg_position,
      top_queries: candidate.queries,
      current_content: seoPage?.content,
    };

    await addToOptimizationQueue(row);
    queued++;
  }

  logger.success(`Queued ${queued} new candidates for ${siteKey}`);
  return queued;
}
