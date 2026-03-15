import dotenv from 'dotenv';
dotenv.config();

import { sites } from '../../config/sites.js';
import { syncPositions } from '../gsc/positions.js';
import { findOptimizationCandidates, queueCandidates } from '../gsc/analyzer.js';
import { log } from '../db/supabase.js';
import { notifyGscAudit, notifyError } from '../notifications/telegram.js';
import * as logger from '../utils/logger.js';

export async function weeklyGscAudit() {
  const startTime = Date.now();
  logger.info('=== Weekly GSC Audit ===');

  const auditResults: Array<{ site: string; candidates: number; topPage?: string }> = [];

  for (const [siteKey, site] of Object.entries(sites)) {
    logger.info(`\n--- Auditing ${siteKey} (${site.domain}) ---`);

    try {
      // 1. Sync latest GSC data
      const rowsSynced = await syncPositions(siteKey);
      logger.info(`Synced ${rowsSynced} new GSC rows`);

      // 2. Find optimization candidates (pages #5-#15)
      const candidates = await findOptimizationCandidates(siteKey);
      logger.info(`Found ${candidates.length} pages between #5 and #15`);

      // 3. Queue them for optimization
      let queued = 0;
      if (candidates.length > 0) {
        queued = await queueCandidates(siteKey, candidates);
      }

      // 4. Track results
      auditResults.push({
        site: siteKey,
        candidates: candidates.length,
        topPage: candidates[0]?.page_url,
      });

      await log('weekly-gsc-audit', `Synced ${rowsSynced} rows, found ${candidates.length} candidates, queued ${queued}`, 'success', siteKey, {
        rowsSynced,
        candidatesFound: candidates.length,
        queued,
        topCandidates: candidates.slice(0, 5).map(c => ({
          url: c.page_url,
          position: c.avg_position,
          impressions: c.total_impressions,
        })),
      });

    } catch (e) {
      const errMsg = (e as Error).message;
      logger.error(`Audit failed for ${siteKey}: ${errMsg}`);
      auditResults.push({ site: siteKey, candidates: 0 });
      await log('weekly-gsc-audit', `Error: ${errMsg}`, 'error', siteKey);
    }
  }

  // Send summary notification
  await notifyGscAudit(auditResults);

  const duration = Date.now() - startTime;
  await log('weekly-gsc-audit', 'Completed', 'info', undefined, { sites: auditResults }, duration);

  logger.info('\n=== Audit Summary ===');
  for (const r of auditResults) {
    logger.info(`  ${r.site}: ${r.candidates} candidates${r.topPage ? ` (top: ${r.topPage})` : ''}`);
  }
  logger.info(`Duration: ${(duration / 1000).toFixed(1)}s`);
}

const isDirectRun = process.argv[1]?.includes('weekly-gsc-audit');
if (isDirectRun) {
  weeklyGscAudit()
    .then(() => {
      logger.success('Weekly GSC audit completed');
      process.exit(0);
    })
    .catch(e => {
      logger.error(`Weekly GSC audit crashed: ${e.message}`);
      notifyError('weekly-gsc-audit', e.message).finally(() => process.exit(1));
    });
}
