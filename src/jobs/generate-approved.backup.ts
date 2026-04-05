import dotenv from 'dotenv';
dotenv.config();

import { sites } from '../../config/sites.js';
import { cities66 } from '../../config/cities-66.js';
import { PageToGenerate } from '../generators/city-service-matrix.js';
import { generateBatch } from '../generators/page-generator.js';
import { upsertSeoPage, markPagesDeployed, log, getPendingPages, updatePendingPageStatus, PendingPageRow } from '../db/supabase.js';
import { injectPages } from '../deployers/inject-pages.js';
import { triggerDeploy } from '../deployers/vercel-deploy.js';
import { notifyGeneration, notifyDeploy, notifyError } from '../notifications/telegram.js';
import { requestBulkIndexation } from '../deployers/indexing.js';
import * as logger from '../utils/logger.js';

/**
 * Reconstruct a PageToGenerate from a PendingPageRow.
 */
function toPTG(row: PendingPageRow): PageToGenerate | null {
  const site = sites[row.site_key];
  if (!site) return null;

  const city = row.city_slug
    ? cities66.find(c => c.slug === row.city_slug)
    : undefined;

  const service = row.service_slug
    ? site.services.find(s => s.slug === row.service_slug)
    : undefined;

  return {
    siteKey: row.site_key,
    site,
    pageType: row.page_type,
    slug: row.slug,
    service,
    city,
  };
}

/**
 * Generate approved pages for a specific site.
 * Returns { generated, deployed, errors }.
 */
export async function generateApprovedForSite(siteKey: string): Promise<{ generated: number; deployed: number; errors: number }> {
  const site = sites[siteKey];
  if (!site) throw new Error(`Unknown site: ${siteKey}`);

  const approvedRows = await getPendingPages(siteKey, 'approved');
  if (approvedRows.length === 0) {
    logger.info(`No approved pages for ${siteKey}`);
    return { generated: 0, deployed: 0, errors: 0 };
  }

  logger.info(`Generating ${approvedRows.length} approved pages for ${siteKey}...`);

  // Mark as generating
  for (const row of approvedRows) {
    if (row.id) await updatePendingPageStatus(row.id, 'generating');
  }

  // Reconstruct PageToGenerate objects
  const batch: PageToGenerate[] = [];
  for (const row of approvedRows) {
    const ptg = toPTG(row);
    if (ptg) batch.push(ptg);
  }

  if (batch.length === 0) {
    logger.warn(`Could not reconstruct any pages for ${siteKey}`);
    return { generated: 0, deployed: 0, errors: 0 };
  }

  // Generate content via Claude API
  const { success: generated, errors } = await generateBatch(batch, 2);

  // Store in Supabase seo_pages
  for (const page of generated) {
    await upsertSeoPage(page);
  }
  logger.success(`Stored ${generated.length} pages in Supabase`);

  // Mark generated pages
  const generatedSlugs = new Set(generated.map(p => p.slug));
  for (const row of approvedRows) {
    if (!row.id) continue;
    if (generatedSlugs.has(row.slug)) {
      await updatePendingPageStatus(row.id, 'generated');
    } else {
      await updatePendingPageStatus(row.id, 'error');
    }
  }

  // Inject into site files
  const injectedSlugs = await injectPages(siteKey, generated);

  // Deploy
  let deployOk = false;
  if (injectedSlugs.length > 0) {
    deployOk = await triggerDeploy(siteKey);
    if (deployOk) {
      await markPagesDeployed(siteKey, injectedSlugs);
    }
  }

  // Request indexation
  if (injectedSlugs.length > 0) {
    try {
      await requestBulkIndexation(siteKey, injectedSlugs);
      logger.success(`Indexation requested for ${injectedSlugs.length} pages`);
    } catch (e) {
      logger.warn(`Indexation failed: ${(e as Error).message}`);
    }
  }

  // Telegram notifications
  if (generated.length > 0) {
    await notifyGeneration(siteKey, generated.length, generated.map(p => p.slug));
    await notifyDeploy(siteKey, deployOk);
  }

  // Log
  await log('generate-approved', `Generated ${generated.length} approved pages`, 'success', siteKey, {
    approved: approvedRows.length,
    generated: generated.length,
    deployed: injectedSlugs.length,
    errors: errors.length,
    slugs: injectedSlugs,
  });

  return {
    generated: generated.length,
    deployed: deployOk ? injectedSlugs.length : 0,
    errors: errors.length,
  };
}

/**
 * Generate approved pages for all sites.
 */
export async function generateAllApproved(): Promise<Record<string, { generated: number; deployed: number; errors: number }>> {
  const results: Record<string, { generated: number; deployed: number; errors: number }> = {};

  // Get all sites that have approved pages
  const allApproved = await getPendingPages(undefined, 'approved');
  const siteKeys = [...new Set(allApproved.map(p => p.site_key))];

  if (siteKeys.length === 0) {
    logger.info('No approved pages to generate');
    return results;
  }

  logger.info(`Generating approved pages for ${siteKeys.length} sites: ${siteKeys.join(', ')}`);

  for (const siteKey of siteKeys) {
    try {
      results[siteKey] = await generateApprovedForSite(siteKey);
    } catch (e) {
      logger.error(`Generation failed for ${siteKey}: ${(e as Error).message}`);
      results[siteKey] = { generated: 0, deployed: 0, errors: 1 };
      await notifyError('generate-approved', `${siteKey}: ${(e as Error).message}`, siteKey);
    }
  }

  return results;
}

// Run directly if called as script
const isDirectRun = process.argv[1]?.includes('generate-approved');
if (isDirectRun) {
  generateAllApproved()
    .then(results => {
      const total = Object.values(results).reduce((s, r) => s + r.generated, 0);
      logger.success(`Generated ${total} approved pages`);
      process.exit(0);
    })
    .catch(e => {
      logger.error(`Generate approved crashed: ${e.message}`);
      notifyError('generate-approved', e.message).finally(() => process.exit(1));
    });
}
