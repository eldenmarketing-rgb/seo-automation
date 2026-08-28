/**
 * GSC Sync — persiste les données Search Console dans gsc_positions.
 *
 * gsc_positions est la source de vérité HISTORIQUE : les snapshots sont
 * upsertés (site_key, date, page_url, query), jamais écrasés par période.
 * Aucun appel IA — collecte pure.
 *
 * Usage :
 *   npx tsx src/jobs/gsc-sync.ts                    → 28 derniers jours (cron quotidien 6:30)
 *   npx tsx src/jobs/gsc-sync.ts --backfill         → 16 mois, par tranches mensuelles
 *   npx tsx src/jobs/gsc-sync.ts --site=vtc         → un seul site
 *   npx tsx src/jobs/gsc-sync.ts --trigger=dashboard → tracé dans automation_logs (cron par défaut : cli)
 *
 * Google livre ses chiffres avec ~3 jours de retard : une synchro lancée le
 * vendredi 28 s'arrête au 25. Relancer plusieurs fois le même jour ne change
 * rien (upsert), ce n'est jamais dangereux.
 *
 * Les propriétés sont auto-découvertes via sites.list() puis mappées vers un
 * site_key par config/gsc-sites.ts. Une propriété non mappée ou un site sans
 * propriété est loggé, jamais inventé.
 */
import dotenv from 'dotenv';
dotenv.config();

import { getSearchConsole } from '../gsc/auth.js';
import { fetchGscRange, storeGscData, fetchGscPageRange, storeGscPageData } from '../gsc/client.js';
import { gscSites } from '../../config/gsc-sites.js';
import { log } from '../db/supabase.js';
import * as logger from '../utils/logger.js';

const BACKFILL_MONTHS = 16;
const GSC_DELAY_DAYS = 3; // les données GSC ont ~3 jours de retard

const args = process.argv.slice(2);
const backfill = args.includes('--backfill');
const onlySite = args.find((a) => a.startsWith('--site='))?.split('=')[1];
const trigger = args.find((a) => a.startsWith('--trigger='))?.split('=')[1] || 'cli';
const action = backfill ? 'backfill' : 'sync';

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
        // Deux vues, deux vérités complémentaires — voir migration-gsc-page-daily.sql :
        // la vue par requête dit SUR QUOI la page ranke mais perd les clics des
        // requêtes anonymisées ; la vue par page dit ce qu'elle rapporte vraiment.
        const rows = await fetchGscRange(siteKey, propertyUrl, chunkStart, chunkEnd);
        const stored = await storeGscData(rows);
        const pageRows = await fetchGscPageRange(siteKey, propertyUrl, chunkStart, chunkEnd);
        const storedPages = await storeGscPageData(pageRows);
        total += stored;
        if (backfill) logger.info(`  ${siteKey} ${chunkStart} → ${chunkEnd} : ${stored} lignes requête · ${storedPages} lignes page`);
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
  await log('gsc-sync', action, hadError ? 'warning' : 'success', undefined, {
    period: { start: fmt(start), end: fmt(end) },
    rows_by_site: results,
    trigger,
    only_site: onlySite ?? null,
  }, durationMs);

  logger.success(`GSC sync terminé en ${Math.round(durationMs / 1000)}s`);
}

run().catch(async (e) => {
  logger.error(`GSC sync fatal: ${e.message}`);
  await log('gsc-sync', action, 'error', undefined, { error: e.message, trigger }).catch(() => {});
  process.exit(1);
});
