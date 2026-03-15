import dotenv from 'dotenv';
dotenv.config();

import { sites } from '../../config/sites.js';
import { processOptimizations } from '../gsc/optimizer.js';
import { log } from '../db/supabase.js';
import { notifyOptimization, notifyError } from '../notifications/telegram.js';
import * as logger from '../utils/logger.js';

const MAX_OPTIMIZATIONS_PER_SITE = 10;

export async function monthlyOptimize() {
  const startTime = Date.now();
  logger.info('=== Monthly Content Optimization ===');

  for (const [siteKey, site] of Object.entries(sites)) {
    logger.info(`\n--- Optimizing ${siteKey} (${site.name}) ---`);

    try {
      const { optimized, failed } = await processOptimizations(siteKey, MAX_OPTIMIZATIONS_PER_SITE);

      await log('monthly-optimize', `Optimized ${optimized}, failed ${failed}`, optimized > 0 ? 'success' : 'info', siteKey, {
        optimized,
        failed,
      });

      if (optimized > 0 || failed > 0) {
        await notifyOptimization(siteKey, optimized, failed);
      }

    } catch (e) {
      const errMsg = (e as Error).message;
      logger.error(`Optimization failed for ${siteKey}: ${errMsg}`);
      await log('monthly-optimize', `Error: ${errMsg}`, 'error', siteKey);
      await notifyError('monthly-optimize', `${siteKey}: ${errMsg}`, siteKey);
    }
  }

  const duration = Date.now() - startTime;
  await log('monthly-optimize', 'Completed', 'info', undefined, {}, duration);
  logger.info(`\nTotal duration: ${(duration / 1000).toFixed(1)}s`);
}

const isDirectRun = process.argv[1]?.includes('monthly-optimize');
if (isDirectRun) {
  monthlyOptimize()
    .then(() => {
      logger.success('Monthly optimization completed');
      process.exit(0);
    })
    .catch(e => {
      logger.error(`Monthly optimization crashed: ${e.message}`);
      notifyError('monthly-optimize', e.message).finally(() => process.exit(1));
    });
}
