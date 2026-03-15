import { getPendingOptimizations, updateOptimizationStatus, upsertSeoPage, getSupabase } from '../db/supabase.js';
import { generateOptimizedContent } from '../generators/page-generator.js';
import { injectPages } from '../deployers/inject-pages.js';
import { triggerDeploy } from '../deployers/vercel-deploy.js';
import * as logger from '../utils/logger.js';

/**
 * Process pending optimization tasks:
 * 1. Get pending items from optimization_queue
 * 2. Regenerate content using Claude API with GSC query data
 * 3. Update the seo_page with optimized content
 * 4. Re-inject into the site files
 * 5. Trigger redeploy
 */
export async function processOptimizations(siteKey?: string, limit = 10): Promise<{ optimized: number; failed: number }> {
  const pending = await getPendingOptimizations(siteKey);
  const toProcess = pending.slice(0, limit);

  if (toProcess.length === 0) {
    logger.info('No pending optimizations to process');
    return { optimized: 0, failed: 0 };
  }

  logger.info(`Processing ${toProcess.length} optimization tasks...`);

  let optimized = 0;
  let failed = 0;
  const siteUpdates = new Map<string, string[]>(); // siteKey → slugs to redeploy

  for (const item of toProcess) {
    try {
      await updateOptimizationStatus(item.id, 'optimizing');

      const topQueries = (item.top_queries as Array<{ query: string; position: number; impressions: number }>) || [];
      const currentContent = (item.current_content as Record<string, unknown>) || {};

      // Generate optimized content via Claude
      const newContent = await generateOptimizedContent(
        currentContent,
        topQueries,
        item.site_key,
        item.page_url,
      );

      // Update optimization queue
      await updateOptimizationStatus(item.id, 'optimized', newContent);

      // Update seo_page if linked
      if (item.seo_page_id) {
        const db = getSupabase();
        const { data: existingPage } = await db
          .from('seo_pages')
          .select('*')
          .eq('id', item.seo_page_id)
          .single();

        if (existingPage) {
          await upsertSeoPage({
            ...existingPage,
            content: newContent,
            meta_title: (newContent.metaTitle as string) || existingPage.meta_title,
            meta_description: (newContent.metaDescription as string) || existingPage.meta_description,
            h1: (newContent.h1 as string) || existingPage.h1,
            status: 'optimized',
            version: (existingPage.version || 1) + 1,
          });

          // Track for re-injection
          const slugs = siteUpdates.get(item.site_key) || [];
          slugs.push(existingPage.slug);
          siteUpdates.set(item.site_key, slugs);
        }
      }

      optimized++;
      logger.success(`Optimized: ${item.page_url}`);

      // Rate limit
      await new Promise(r => setTimeout(r, 2000));
    } catch (e) {
      failed++;
      logger.error(`Failed to optimize ${item.page_url}: ${(e as Error).message}`);
      await updateOptimizationStatus(item.id, 'failed');
    }
  }

  // Re-inject and redeploy updated sites
  for (const [sk, slugs] of siteUpdates) {
    try {
      const db = getSupabase();
      const { data: updatedPages } = await db
        .from('seo_pages')
        .select('*')
        .eq('site_key', sk)
        .in('slug', slugs);

      if (updatedPages && updatedPages.length > 0) {
        await injectPages(sk, updatedPages);
        await triggerDeploy(sk);
        logger.success(`Re-deployed ${sk} with ${slugs.length} optimized pages`);
      }
    } catch (e) {
      logger.error(`Re-deploy failed for ${sk}: ${(e as Error).message}`);
    }
  }

  return { optimized, failed };
}
