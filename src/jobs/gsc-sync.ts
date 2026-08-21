/**
 * GSC Sync — persiste les données Search Console dans gsc_positions.
 *
 * gsc_positions est la source de vérité HISTORIQUE : les snapshots sont
 * upsertés (site_key, date, page_url, query), jamais écrasés par période.
 * Aucun appel IA — collecte pure.
 *
 * Usage :
 *   npx tsx src/jobs/gsc-sync.ts                → 28 derniers jours (cron lundi 7:00)
 *   npx tsx src/jobs/gsc-sync.ts --backfill     → 16 mois, par tranches mensuelles
 *   npx tsx src/jobs/gsc-sync.ts --site=vtc     → un seul site
 *
 * Les propriétés sont auto-découvertes via sites.list() puis mappées vers un
 * site_key par config/gsc-sites.ts. Une propriété non mappée ou un site sans
 * propriété est loggé, jamais inventé.
 */
import dotenv from 'dotenv';
dotenv.config();

import { getSearchConsole } from '../gsc/auth.js';
import { fetchGscRange, storeGscData } from '../gsc/client.js';
import { gscSites } from '../../config/gsc-sites.js';
import { log } from '../db/supabase.js';
import * as logger from '../utils/logger.js';

const BACKFILL_MONTHS = 16;
const GSC_DELAY_DAYS = 3; // les données GSC ont ~3 jours de retard

const args = process.argv.slice(2);
const backfill = args.includes('--backfill');
const onlySite = args.find((a) => a.startsWith('--site='))?.split('=')[1];

const fmt = (d: Date) => d.toISOString().split('T')[0];

function monthChunks(start: Date, end: Date): Array<[string, string]> {
  const chunks: Array<[string, string]> = [];
  const cursor = new Date(start);
  while (cursor < end) {
    const chunkEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate());
    chunks.push([fmt(cursor), fmt(chunkEnd < end ? chunkEnd : end)]);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return chunks;
}

async function discoverProperties(): Promise<Map<string, string>> {
  const searchconsole = getSearchConsole();
  const res = await searchconsole.sites.list();
  const found = new Map<string, string>(); // site_key → property URL

  for (const entry of res.data.siteEntry || []) {
    const url = entry.siteUrl || '';
    const domain = url.replace(/^sc-domain:/, '').replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
    const siteKey = gscSites[domain];
    if (siteKey) {
      found.set(siteKey, url);
    } else {
      logger.warn(`GSC sync: propriété accessible non mappée dans config/gsc-sites.ts : ${url}`);
    }
  }

  for (const [domain, siteKey] of Object.entries(gscSites)) {
    if (!found.has(siteKey)) {
      logger.warn(`GSC sync: pas de propriété accessible pour ${siteKey} (${domain}) — ajouter le service account dans sa Search Console`);
    }
  }

  return found;
}

async function run() {
  const startTime = Date.now();
  logger.info(`=== GSC Sync ${backfill ? `(backfill ${BACKFILL_MONTHS} mois)` : '(28 jours)'} ===`);

  const properties = await discoverProperties();
  const targets = [...properties.entries()].filter(([key]) => !onlySite || key === onlySite);

  if (targets.length === 0) {
    logger.error(`GSC sync: aucun site à synchroniser${onlySite ? ` (site inconnu ou sans propriété : ${onlySite})` : ''}`);
    process.exit(1);
  }

  const end = new Date();
  end.setDate(end.getDate() - GSC_DELAY_DAYS);
  const start = new Date(end);
  if (backfill) start.setMonth(start.getMonth() - BACKFILL_MONTHS);
  else start.setDate(start.getDate() - 28);

  const results: Record<string, number> = {};
  let hadError = false;

  for (const [siteKey, propertyUrl] of targets) {
    let total = 0;
    try {
      for (const [chunkStart, chunkEnd] of monthChunks(start, end)) {
        const rows = await fetchGscRange(siteKey, propertyUrl, chunkStart, chunkEnd);
        const stored = await storeGscData(rows);
        total += stored;
        if (backfill) logger.info(`  ${siteKey} ${chunkStart} → ${chunkEnd} : ${stored} lignes`);
      }
      results[siteKey] = total;
      logger.success(`GSC sync ${siteKey}: ${total} lignes`);
    } catch (e) {
      hadError = true;
      results[siteKey] = -1;
      logger.error(`GSC sync ${siteKey} failed: ${(e as Error).message}`);
    }
  }

  const durationMs = Date.now() - startTime;
  await log('gsc-sync', backfill ? 'backfill' : 'weekly-sync', hadError ? 'warning' : 'success', undefined, {
    period: { start: fmt(start), end: fmt(end) },
    rows_by_site: results,
  }, durationMs);

  logger.success(`GSC sync terminé en ${Math.round(durationMs / 1000)}s`);
}

run().catch(async (e) => {
  logger.error(`GSC sync fatal: ${e.message}`);
  await log('gsc-sync', backfill ? 'backfill' : 'weekly-sync', 'error', undefined, { error: e.message }).catch(() => {});
  process.exit(1);
});
