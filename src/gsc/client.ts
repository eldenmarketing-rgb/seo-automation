import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import path from 'path';
import dotenv from 'dotenv';
import { sites } from '../../config/sites.js';
import { getSupabase } from '../db/supabase.js';
import * as logger from '../utils/logger.js';

dotenv.config();

const SERVICE_ACCOUNT_PATH = process.env.GSC_SERVICE_ACCOUNT_PATH || './config/gsc-service-account.json';

function getAuth() {
  const keyFilePath = path.resolve(SERVICE_ACCOUNT_PATH);
  return new GoogleAuth({
    keyFile: keyFilePath,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
}

// GSC uses site URLs in specific format
function getGscSiteUrl(domain: string): string {
  // Try both formats — sc-domain: for domain properties, URL for URL-prefix properties
  return domain.replace(/\/$/, '');
}

export interface GscRow {
  site_key: string;
  date: string;
  page_url: string;
  query: string;
  position: number;
  impressions: number;
  clicks: number;
  ctr: number;
}

/**
 * Fetch Search Console data for a site over a date range.
 * Returns per-query, per-page performance data.
 */
export async function fetchGscData(
  siteKey: string,
  days = 28,
): Promise<GscRow[]> {
  const site = sites[siteKey];
  if (!site) throw new Error(`Unknown site: ${siteKey}`);

  const auth = getAuth();
  const searchconsole = google.searchconsole({ version: 'v1', auth });

  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 3); // GSC data has 3-day delay
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);

  const siteUrl = getGscSiteUrl(site.domain);

  // Try sc-domain first, then URL-prefix
  const siteUrls = [
    `sc-domain:${siteUrl.replace(/^https?:\/\//, '').replace(/^www\./, '')}`,
    siteUrl,
    siteUrl + '/',
  ];

  let response;
  let usedUrl = '';

  for (const url of siteUrls) {
    try {
      response = await searchconsole.searchanalytics.query({
        siteUrl: url,
        requestBody: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          dimensions: ['query', 'page', 'date'],
          rowLimit: 5000,
        },
      });
      usedUrl = url;
      break;
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes('403') || msg.includes('not found') || msg.includes('User does not have')) {
        logger.warn(`GSC: ${url} — ${msg.slice(0, 100)}`);
        continue;
      }
      throw e;
    }
  }

  if (!response || !response.data.rows) {
    logger.warn(`GSC: No data for ${siteKey} (tried: ${siteUrls.join(', ')})`);
    return [];
  }

  logger.info(`GSC: ${response.data.rows.length} rows for ${siteKey} (via ${usedUrl})`);

  return response.data.rows.map((row) => ({
    site_key: siteKey,
    date: (row.keys![2] as string),
    query: (row.keys![0] as string),
    page_url: (row.keys![1] as string),
    position: row.position || 0,
    impressions: row.impressions || 0,
    clicks: row.clicks || 0,
    ctr: row.ctr || 0,
  }));
}

/**
 * Store GSC data in Supabase gsc_positions table.
 * Upserts to avoid duplicates.
 */
export async function storeGscData(rows: GscRow[]): Promise<number> {
  if (rows.length === 0) return 0;

  const db = getSupabase();
  let stored = 0;

  // Batch upsert in chunks of 500
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await db
      .from('gsc_positions')
      .upsert(chunk, { onConflict: 'site_key,date,page_url,query' });

    if (error) {
      logger.error(`GSC store error: ${error.message}`);
    } else {
      stored += chunk.length;
    }
  }

  return stored;
}

/**
 * Fetch and store GSC data for all sites.
 */
export async function syncAllGscData(days = 28): Promise<Record<string, number>> {
  const results: Record<string, number> = {};

  for (const siteKey of Object.keys(sites)) {
    try {
      const rows = await fetchGscData(siteKey, days);
      const stored = await storeGscData(rows);
      results[siteKey] = stored;
      logger.success(`GSC sync ${siteKey}: ${stored} rows`);
    } catch (e) {
      logger.error(`GSC sync ${siteKey} failed: ${(e as Error).message}`);
      results[siteKey] = -1;
    }
  }

  return results;
}

/**
 * Quick summary: top queries and positions for a site.
 * Used by the Telegram bot /seo command.
 */
export async function getGscSummary(siteKey: string, days = 28): Promise<{
  totalImpressions: number;
  totalClicks: number;
  avgPosition: number;
  topQueries: Array<{ query: string; impressions: number; clicks: number; position: number }>;
  pagesInTop3: number;
  pagesInTop10: number;
  pages5to15: number;
}> {
  const rows = await fetchGscData(siteKey, days);

  if (rows.length === 0) {
    return { totalImpressions: 0, totalClicks: 0, avgPosition: 0, topQueries: [], pagesInTop3: 0, pagesInTop10: 0, pages5to15: 0 };
  }

  // Aggregate by query
  const queryMap = new Map<string, { impressions: number; clicks: number; positions: number[] }>();
  for (const row of rows) {
    const existing = queryMap.get(row.query) || { impressions: 0, clicks: 0, positions: [] };
    existing.impressions += row.impressions;
    existing.clicks += row.clicks;
    existing.positions.push(row.position);
    queryMap.set(row.query, existing);
  }

  // Aggregate by page
  const pageMap = new Map<string, number[]>();
  for (const row of rows) {
    const existing = pageMap.get(row.page_url) || [];
    existing.push(row.position);
    pageMap.set(row.page_url, existing);
  }

  const totalImpressions = rows.reduce((s, r) => s + r.impressions, 0);
  const totalClicks = rows.reduce((s, r) => s + r.clicks, 0);
  const avgPosition = rows.reduce((s, r) => s + r.position, 0) / rows.length;

  // Top queries by impressions
  const topQueries = [...queryMap.entries()]
    .map(([query, data]) => ({
      query,
      impressions: data.impressions,
      clicks: data.clicks,
      position: Math.round((data.positions.reduce((a, b) => a + b, 0) / data.positions.length) * 10) / 10,
    }))
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 15);

  // Count pages by position range
  let pagesInTop3 = 0;
  let pagesInTop10 = 0;
  let pages5to15 = 0;
  for (const [, positions] of pageMap) {
    const avg = positions.reduce((a, b) => a + b, 0) / positions.length;
    if (avg <= 3) pagesInTop3++;
    if (avg <= 10) pagesInTop10++;
    if (avg >= 5 && avg <= 15) pages5to15++;
  }

  return { totalImpressions, totalClicks, avgPosition, topQueries, pagesInTop3, pagesInTop10, pages5to15 };
}
