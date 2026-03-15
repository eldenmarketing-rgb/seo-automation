import { getSearchConsole } from './auth.js';
import { sites } from '../../config/sites.js';
import { GscPositionRow, insertGscPositions, getLatestGscDate } from '../db/supabase.js';
import * as logger from '../utils/logger.js';

interface GscRow {
  keys: string[];   // [query, page]
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

/**
 * Fetch Search Analytics data from GSC for a site.
 * Returns page-level query performance data.
 */
export async function fetchPositions(
  siteKey: string,
  startDate: string,
  endDate: string,
): Promise<GscPositionRow[]> {
  const site = sites[siteKey];
  if (!site) throw new Error(`Unknown site: ${siteKey}`);

  const searchConsole = getSearchConsole();
  const siteUrl = site.domain;

  logger.info(`Fetching GSC data for ${siteKey} (${startDate} → ${endDate})...`);

  const rows: GscPositionRow[] = [];
  let startRow = 0;
  const rowLimit = 25000;

  while (true) {
    const response = await searchConsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['query', 'page', 'date'],
        rowLimit,
        startRow,
        type: 'web',
      },
    });

    const data = response.data.rows as GscRow[] | undefined;
    if (!data || data.length === 0) break;

    for (const row of data) {
      rows.push({
        site_key: siteKey,
        query: row.keys[0],
        page_url: row.keys[1],
        date: row.keys[2],
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      });
    }

    logger.info(`  Fetched ${rows.length} rows so far...`);

    if (data.length < rowLimit) break;
    startRow += rowLimit;
  }

  logger.success(`Fetched ${rows.length} total GSC rows for ${siteKey}`);
  return rows;
}

/**
 * Fetch and store GSC positions for a site.
 * Only fetches data newer than the latest date in DB.
 */
export async function syncPositions(siteKey: string): Promise<number> {
  // Determine date range
  const latestDate = await getLatestGscDate(siteKey);
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 3); // GSC data has 3-day lag

  let startDate: Date;
  if (latestDate) {
    startDate = new Date(latestDate);
    startDate.setDate(startDate.getDate() + 1); // Day after latest
  } else {
    startDate = new Date();
    startDate.setDate(startDate.getDate() - 28); // Last 28 days
  }

  if (startDate >= endDate) {
    logger.info(`GSC data for ${siteKey} is up to date`);
    return 0;
  }

  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const rows = await fetchPositions(siteKey, fmt(startDate), fmt(endDate));

  if (rows.length > 0) {
    await insertGscPositions(rows);
    logger.success(`Stored ${rows.length} GSC rows for ${siteKey}`);
  }

  return rows.length;
}

/**
 * Sync GSC positions for all configured sites.
 */
export async function syncAllPositions(): Promise<Record<string, number>> {
  const results: Record<string, number> = {};
  for (const key of Object.keys(sites)) {
    try {
      results[key] = await syncPositions(key);
    } catch (e) {
      logger.error(`GSC sync failed for ${key}: ${(e as Error).message}`);
      results[key] = 0;
    }
  }
  return results;
}
