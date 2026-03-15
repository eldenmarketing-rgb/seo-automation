import dotenv from 'dotenv';
dotenv.config();

import { sites } from '../../config/sites.js';
import { generateMatrix, PageToGenerate } from '../generators/city-service-matrix.js';
import { generateBatch } from '../generators/page-generator.js';
import { upsertSeoPage, getExistingSlugs, markPagesDeployed, log } from '../db/supabase.js';
import { injectPages, getExistingSlugsFromFiles } from '../deployers/inject-pages.js';
import { triggerDeploy } from '../deployers/vercel-deploy.js';
import { notifyGeneration, notifyDeploy, notifyError } from '../notifications/telegram.js';
import { requestBulkIndexation } from '../deployers/indexing.js';
import * as logger from '../utils/logger.js';

const PAGES_PER_RUN = parseInt(process.env.PAGES_PER_RUN || '5', 10);

export async function dailyGenerate(pagesPerRunOverride?: number) {
  const PAGES_PER_RUN_LOCAL = pagesPerRunOverride ?? PAGES_PER_RUN;
  const startTime = Date.now();
  logger.info('=== Daily SEO Generation ===');
  logger.info(`Target: ${PAGES_PER_RUN_LOCAL} pages per site`);

  const allResults: Record<string, { generated: number; deployed: number; errors: number }> = {};

  for (const [siteKey, site] of Object.entries(sites)) {
    const siteStart = Date.now();
    logger.info(`\n--- Processing ${siteKey} (${site.name}) ---`);

    try {
      // 1. Get all possible pages for this site
      const matrix = generateMatrix(siteKey);
      logger.info(`Matrix: ${matrix.length} total pages possible`);

      // 2. Get already existing slugs (Supabase + site data files)
      const supabaseSlugs = await getExistingSlugs(siteKey);
      const fileSlugs = getExistingSlugsFromFiles(siteKey);
      const existingSlugs = [...new Set([...supabaseSlugs, ...fileSlugs])];
      logger.info(`Existing: ${supabaseSlugs.length} in Supabase, ${fileSlugs.length} in site files, ${existingSlugs.length} unique total`);

      // 3. Filter out already generated pages
      const newPages = matrix.filter(p => !existingSlugs.includes(p.slug));
      logger.info(`New pages available: ${newPages.length}`);

      if (newPages.length === 0) {
        logger.info(`All pages already generated for ${siteKey}`);
        allResults[siteKey] = { generated: 0, deployed: 0, errors: 0 };
        continue;
      }

      // 4. Prioritize: city-only pages first (less expensive, more impactful)
      const prioritized = [
        ...newPages.filter(p => p.pageType === 'city'),
        ...newPages.filter(p => p.pageType === 'city_service'),
      ];

      // 5. Take only PAGES_PER_RUN pages
      const batch = prioritized.slice(0, PAGES_PER_RUN_LOCAL);
      logger.info(`Generating batch of ${batch.length} pages...`);

      // 6. Generate content via Claude API
      const { success: generated, errors } = await generateBatch(batch, 2);

      // 7. Store in Supabase
      for (const page of generated) {
        await upsertSeoPage(page);
      }
      logger.success(`Stored ${generated.length} pages in Supabase`);

      // 8. Inject into site files
      const injectedSlugs = await injectPages(siteKey, generated);

      // 9. Trigger Vercel deploy
      let deployOk = false;
      if (injectedSlugs.length > 0) {
        deployOk = await triggerDeploy(siteKey);
        if (deployOk) {
          await markPagesDeployed(siteKey, injectedSlugs);
        }
      }

      // 10. Log results
      const duration = Date.now() - siteStart;
      allResults[siteKey] = {
        generated: generated.length,
        deployed: deployOk ? injectedSlugs.length : 0,
        errors: errors.length,
      };

      await log('daily-generate', `Generated ${generated.length} pages`, 'success', siteKey, {
        generated: generated.length,
        deployed: injectedSlugs.length,
        errors: errors.length,
        slugs: injectedSlugs,
      }, duration);

      // 11. Request instant indexation for new pages
      if (injectedSlugs.length > 0) {
        try {
          await requestBulkIndexation(siteKey, injectedSlugs);
          logger.success(`Indexation requested for ${injectedSlugs.length} new pages`);
        } catch (e) {
          logger.warn(`Indexation request failed: ${(e as Error).message}`);
        }
      }

      // 12. Telegram notification
      if (generated.length > 0) {
        await notifyGeneration(siteKey, generated.length, generated.map(p => p.slug));
        await notifyDeploy(siteKey, deployOk);
      }

    } catch (e) {
      const errMsg = (e as Error).message;
      logger.error(`Fatal error for ${siteKey}: ${errMsg}`);
      allResults[siteKey] = { generated: 0, deployed: 0, errors: 1 };
      await log('daily-generate', `Error: ${errMsg}`, 'error', siteKey);
      await notifyError('daily-generate', `${siteKey}: ${errMsg}`, siteKey);
    }
  }

  // Final summary
  const totalDuration = Date.now() - startTime;
  const totalGenerated = Object.values(allResults).reduce((s, r) => s + r.generated, 0);
  const totalDeployed = Object.values(allResults).reduce((s, r) => s + r.deployed, 0);
  const totalErrors = Object.values(allResults).reduce((s, r) => s + r.errors, 0);

  logger.info('\n=== Summary ===');
  logger.info(`Total generated: ${totalGenerated}`);
  logger.info(`Total deployed: ${totalDeployed}`);
  logger.info(`Total errors: ${totalErrors}`);
  logger.info(`Duration: ${(totalDuration / 1000).toFixed(1)}s`);

  for (const [key, result] of Object.entries(allResults)) {
    logger.info(`  ${key}: ${result.generated} generated, ${result.deployed} deployed, ${result.errors} errors`);
  }

  await log('daily-generate', 'Completed', 'info', undefined, {
    totalGenerated,
    totalDeployed,
    totalErrors,
    sites: allResults,
  }, totalDuration);

  return { totalGenerated, totalDeployed, totalErrors, duration: totalDuration, sites: allResults };
}

// Run directly if called as script
const isDirectRun = process.argv[1]?.includes('daily-generate');
if (isDirectRun) {
  dailyGenerate()
    .then(() => {
      logger.success('Daily generation completed');
      process.exit(0);
    })
    .catch(e => {
      logger.error(`Daily generation crashed: ${e.message}`);
      notifyError('daily-generate', e.message).finally(() => process.exit(1));
    });
}
