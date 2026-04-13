/**
 * Backfill intent_type for all discovered keywords.
 *
 * Usage:
 *   npm run backfill-intents            # all sites
 *   npm run backfill-intents -- garage   # single site
 */

import dotenv from 'dotenv';
dotenv.config();

import { backfillIntents } from '../src/keywords/intent-classifier.js';
import * as logger from '../src/utils/logger.js';

const siteKey = process.argv[2] || undefined;

logger.info(`=== Backfill Intent Types ===`);
if (siteKey) logger.info(`Site: ${siteKey}`);

backfillIntents(siteKey)
  .then(count => {
    if (count === -1) {
      logger.error('Migration required. Run: src/db/migration-intent-type.sql');
      process.exit(1);
    }
    logger.success(`Done: ${count} keywords classified`);
    process.exit(0);
  })
  .catch(e => {
    logger.error(`Backfill failed: ${e.message}`);
    process.exit(1);
  });
