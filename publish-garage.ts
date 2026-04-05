/**
 * Publish 10 draft garage pages:
 * 1. Fetch drafts from Supabase
 * 2. Inject into Site_Garage data files (merge services, add cities)
 * 3. Git commit in Site_Garage
 * 4. Trigger Vercel deploy
 * 5. Request Google indexation
 * 6. Update status to 'published' in Supabase
 */

import { getSupabase, upsertSeoPage } from './src/db/supabase.js';
import { injectPages } from './src/deployers/inject-pages.js';
import { triggerDeploy } from './src/deployers/vercel-deploy.js';
import { requestBulkIndexation } from './src/deployers/indexing.js';
import * as logger from './src/utils/logger.js';
import { execSync } from 'child_process';
import { sites } from './config/sites.js';

async function main() {
  const db = getSupabase();
  const site = sites.garage;

  // 1. Fetch draft pages
  logger.info('Fetching draft garage pages from Supabase...');
  const { data: drafts, error } = await db
    .from('seo_pages')
    .select('*')
    .eq('site_key', 'garage')
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw new Error(`Supabase fetch error: ${error.message}`);
  if (!drafts || drafts.length === 0) {
    logger.warn('No draft pages found for garage.');
    return;
  }

  console.log(`\nFound ${drafts.length} draft pages:\n`);
  drafts.forEach((p, i) => console.log(`  ${i + 1}. ${p.slug} [${p.intent || 'service'}] — ${p.city || ''} / ${p.service || 'hub'}`));
  console.log('');

  // 2. Inject into Site_Garage
  logger.info('Injecting pages into Site_Garage...');
  const injected = await injectPages('garage', drafts);
  logger.success(`Injected ${injected.length} pages`);

  if (injected.length === 0) {
    logger.warn('No pages injected (all may already exist). Continuing...');
  }

  // 3. Git commit in Site_Garage
  logger.info('Git commit in Site_Garage...');
  try {
    execSync('git add data/services.ts data/cities.ts next-sitemap.config.js', {
      cwd: site.projectPath,
      stdio: 'pipe',
    });
    execSync(`git commit -m "feat: inject 10 SEO pages (5 city hubs + 5 services) via universal system v2"`, {
      cwd: site.projectPath,
      stdio: 'pipe',
    });
    execSync('git push origin main', {
      cwd: site.projectPath,
      stdio: 'pipe',
    });
    logger.success('Git push OK');
  } catch (e: any) {
    const msg = e.stderr?.toString() || e.message;
    if (msg.includes('nothing to commit')) {
      logger.warn('Nothing to commit (pages already in files)');
    } else {
      logger.error(`Git error: ${msg}`);
    }
  }

  // 4. Trigger Vercel deploy
  logger.info('Triggering Vercel deploy...');
  const deployed = await triggerDeploy('garage');
  if (deployed) {
    logger.success('Vercel deploy triggered');
  } else {
    logger.warn('Vercel deploy failed or no hook configured');
  }

  // 5. Request Google indexation
  logger.info('Requesting Google indexation...');
  try {
    const indexResult = await requestBulkIndexation('garage', injected);
    logger.success(`Indexation: ${indexResult.google} Google + ${indexResult.indexNow} IndexNow / ${indexResult.total} total`);
  } catch (e) {
    logger.warn(`Indexation error: ${(e as Error).message}`);
  }

  // 6. Update status to 'published' in Supabase
  logger.info('Updating status to published in Supabase...');
  const now = new Date().toISOString();
  for (const page of drafts) {
    await upsertSeoPage({
      ...page,
      status: 'published',
      deployed_at: now,
    });
  }
  logger.success(`${drafts.length} pages marked as published`);

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('PUBLICATION TERMINÉE');
  console.log('═'.repeat(60));
  console.log(`Pages injectées : ${injected.length}`);
  console.log(`Vercel deploy   : ${deployed ? 'OK' : 'SKIP'}`);
  console.log(`Status Supabase : published (${drafts.length} pages)`);
  console.log(`Indexation      : ${injected.length} URLs soumises`);
  console.log('═'.repeat(60));
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
