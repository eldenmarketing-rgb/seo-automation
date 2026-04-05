import dotenv from 'dotenv';
dotenv.config();

import { sites } from '../../config/sites.js';
import { generateMatrix, PageToGenerate } from '../generators/universal-matrix.js';
import { getSiteModeConfig } from '../../config/site-mode-registry.js';
import { getExistingSlugs, log, addToOptimizationQueue, upsertPendingPages, getTopKeywordOpportunities, PendingPageRow, KeywordOpportunity } from '../db/supabase.js';
import { getExistingSlugsFromFiles } from '../deployers/inject-pages.js';
import { notifyError, sendTelegram } from '../notifications/telegram.js';
import { fetchGscData, GscRow } from '../gsc/client.js';
import * as logger from '../utils/logger.js';

const PAGES_PER_RUN = parseInt(process.env.PAGES_PER_RUN || '5', 10);

// Sites exclus du daily-generate
const EXCLUDED_SITES = ['massage'];


// ─── Scoring ────────────────────────────────────────────────────

interface ScoredPage extends PageToGenerate {
  score: number;
  scoreDetails: string;
}


/**
 * Score heuristique quand Google Suggest est indisponible.
 * Basé sur: zone géographique, type de page, popularité du service.
 */
function computeHeuristicScore(page: PageToGenerate): { score: number; details: string } {
  let score = 0;
  const parts: string[] = [];

  // Géographie : utilise population et slug pour estimer la priorité
  const citySlug = page.city?.slug;
  const pop = page.city?.population || 0;
  if (citySlug === 'perpignan') { score += 5; parts.push('zone:perpignan+5'); }
  else if (pop > 10000) { score += 4; parts.push('zone:big+4'); }
  else if (pop > 5000) { score += 3; parts.push('zone:medium+3'); }
  else if (pop > 2000) { score += 2; parts.push('zone:small+2'); }
  else { score += 1; parts.push('zone:other+1'); }

  // Type de page : city_service > city > topic > product
  if (page.pageType === 'city_service') { score += 3; parts.push('type:city_svc+3'); }
  else if (page.pageType === 'city') { score += 2; parts.push('type:city+2'); }
  else if (page.pageType === 'topic' || page.pageType === 'topic_intent') { score += 2; parts.push('type:topic+2'); }
  else if (page.pageType === 'product') { score += 1; parts.push('type:product+1'); }
  else { score += 1; parts.push('type:other+1'); }

  // Service transactionnel : certains services ont plus de valeur
  const highValueServices = ['vidange', 'freins', 'embrayage', 'climatisation', 'pneus', 'diagnostic', 'controle-technique'];
  if (page.service && highValueServices.includes(page.service.slug)) {
    score += 2;
    parts.push('svc:highval+2');
  }

  // Population / importance de la ville
  const bigCities = ['perpignan', 'canet-en-roussillon', 'saint-cyprien', 'argeles-sur-mer', 'rivesaltes', 'thuir', 'elne'];
  if (page.city && bigCities.includes(page.city.slug)) {
    score += 1;
    parts.push('pop:+1');
  }

  return { score, details: `heuristic: ${parts.join(', ')}` };
}


// ─── GSC Intelligence ───────────────────────────────────────────

interface GscPageSummary {
  pageUrl: string;
  slug: string;
  avgPosition: number;
  totalImpressions: number;
  topQueries: Array<{ query: string; position: number; impressions: number }>;
}

function aggregateGscByPage(rows: GscRow[]): GscPageSummary[] {
  const pageMap = new Map<string, { positions: number[]; impressions: number; queries: Array<{ query: string; position: number; impressions: number }> }>();

  for (const row of rows) {
    const existing = pageMap.get(row.page_url) || { positions: [], impressions: 0, queries: [] };
    existing.positions.push(row.position);
    existing.impressions += row.impressions;
    existing.queries.push({ query: row.query, position: row.position, impressions: row.impressions });
    pageMap.set(row.page_url, existing);
  }

  return Array.from(pageMap.entries()).map(([pageUrl, data]) => {
    const avgPosition = data.positions.reduce((a, b) => a + b, 0) / data.positions.length;
    const urlPath = new URL(pageUrl).pathname;
    const slug = urlPath.replace(/^\/|\/$/g, '').split('/').pop() || '';
    return {
      pageUrl,
      slug,
      avgPosition: Math.round(avgPosition * 10) / 10,
      totalImpressions: data.impressions,
      topQueries: data.queries.sort((a, b) => b.impressions - a.impressions).slice(0, 5),
    };
  });
}


// ─── Telegram Summary with Inline Keyboards ─────────────────────

/**
 * Send a Telegram message with scored pages and approval buttons.
 * Uses the bot token directly (no bot instance needed).
 */
async function sendApprovalMessage(
  siteKey: string,
  siteName: string,
  pages: Array<PendingPageRow & { id: string }>,
  batchId: string,
): Promise<void> {
  if (pages.length === 0) return;

  const top = pages.slice(0, 15);
  const lines = top.map((p, i) =>
    `${i + 1}. <code>${p.slug}</code> — score <b>${p.score}</b>\n   <i>${p.score_details || ''}</i>`
  );
  if (pages.length > 15) {
    lines.push(`\n<i>... et ${pages.length - 15} autres</i>`);
  }

  const msg =
    `<b>📋 Pages proposées — ${siteName}</b>\n` +
    `<b>${pages.length} pages</b> (batch: ${batchId})\n\n` +
    lines.join('\n') +
    `\n\n` +
    `Utilise les boutons pour approuver/rejeter, ou tape /approve`;

  // Build inline keyboard
  const keyboard: Array<Array<{ text: string; callback_data: string }>> = [];

  // Individual buttons for top 8 pages (2 per row: approve + reject)
  for (const p of top.slice(0, 8)) {
    keyboard.push([
      { text: `✅ ${p.slug.slice(0, 25)}`, callback_data: `pa:${p.id}` },
      { text: `❌`, callback_data: `pr:${p.id}` },
    ]);
  }

  // Bulk buttons
  keyboard.push([
    { text: `✅ Tout valider (${pages.length})`, callback_data: `paa:${siteKey}` },
    { text: `❌ Tout rejeter`, callback_data: `pra:${siteKey}` },
  ]);

  // Generate button
  keyboard.push([
    { text: `🚀 Générer les approuvées`, callback_data: `pgo:${siteKey}` },
  ]);

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const ADMIN_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  if (!BOT_TOKEN || !ADMIN_CHAT_ID) return;

  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text: msg,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: { inline_keyboard: keyboard },
      }),
    });
  } catch (e) {
    logger.warn(`Failed to send approval message for ${siteKey}: ${(e as Error).message}`);
  }
}

// ─── Main Job — Score & Store, No Generation ────────────────────

export async function dailyGenerate(pagesPerRunOverride?: number) {
  const PAGES_PER_RUN_LOCAL = pagesPerRunOverride ?? PAGES_PER_RUN;
  const startTime = Date.now();
  const batchId = `batch-${new Date().toISOString().slice(0, 10)}-${Date.now().toString(36)}`;

  logger.info('=== Daily SEO Scoring (Approval Mode) ===');
  logger.info(`Target: ${PAGES_PER_RUN_LOCAL} pages per site`);
  logger.info(`Batch: ${batchId}`);
  logger.info(`Excluded sites: ${EXCLUDED_SITES.join(', ')}`);

  const allResults: Record<string, { scored: number; pending: number; queued: number; discovered: number; kwBoosted: number; errors: number }> = {};

  for (const [siteKey, site] of Object.entries(sites)) {
    if (EXCLUDED_SITES.includes(siteKey)) {
      logger.info(`\n--- Skipping ${siteKey} (excluded) ---`);
      allResults[siteKey] = { scored: 0, pending: 0, queued: 0, discovered: 0, kwBoosted: 0, errors: 0 };
      continue;
    }

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
      logger.info(`Existing: ${existingSlugs.length} unique`);

      // 3. Fetch GSC data
      let gscPages: GscPageSummary[] = [];
      let queuedForOptimization = 0;
      try {
        const gscRows = await fetchGscData(siteKey, 28);
        if (gscRows.length > 0) {
          gscPages = aggregateGscByPage(gscRows);
          logger.info(`GSC: ${gscPages.length} pages with data`);

          for (const gscPage of gscPages) {
            if (gscPage.avgPosition <= 5) {
              logger.info(`  [SKIP] ${gscPage.slug} — pos ${gscPage.avgPosition} (top 5)`);
            } else if (gscPage.avgPosition <= 20 && gscPage.totalImpressions > 0) {
              try {
                await addToOptimizationQueue({
                  site_key: siteKey,
                  page_url: gscPage.pageUrl,
                  avg_position: gscPage.avgPosition,
                  top_queries: gscPage.topQueries as unknown as Record<string, unknown>[],
                });
                queuedForOptimization++;
                logger.info(`  [QUEUE] ${gscPage.slug} — pos ${gscPage.avgPosition} → optimization_queue`);
              } catch (e) {
                const msg = (e as Error).message;
                if (!msg.includes('duplicate') && !msg.includes('unique')) {
                  logger.warn(`  Failed to queue ${gscPage.slug}: ${msg}`);
                }
              }
            }
          }
        }
      } catch (e) {
        logger.warn(`GSC fetch failed for ${siteKey}: ${(e as Error).message}`);
      }

      // 4. Filter out already generated pages + top 5 GSC
      const newPages = matrix.filter(p => !existingSlugs.includes(p.slug));
      const top5Slugs = new Set(gscPages.filter(p => p.avgPosition <= 5).map(p => p.slug));
      const candidatePages = newPages.filter(p => !top5Slugs.has(p.slug));
      logger.info(`Candidates: ${candidatePages.length}`);

      if (candidatePages.length === 0) {
        allResults[siteKey] = { scored: 0, pending: 0, queued: queuedForOptimization, discovered: 0, kwBoosted: 0, errors: 0 };
        continue;
      }

      // 5. Score from Supabase discovered_keywords — ZERO API calls
      logger.info(`Scoring ${candidatePages.length} candidates from Supabase...`);
      const scoredPages: ScoredPage[] = [];

      // Fetch all discovered_keywords for this site (already scored 0-100 by DataForSEO)
      let kwOpportunities: KeywordOpportunity[] = [];
      try {
        kwOpportunities = await getTopKeywordOpportunities(siteKey, 200);
      } catch (e) {
        logger.warn(`Failed to fetch keyword opportunities: ${(e as Error).message}`);
      }

      // Build slug-pattern → opportunity map
      const oppMap = new Map<string, KeywordOpportunity>();
      for (const opp of kwOpportunities) {
        const baseSlug = opp.suggested_page
          .replace(/^NEW:\s*/, '')
          .replace(/\[ville\]/g, '')
          .replace(/-+$/g, '')
          .toLowerCase();
        oppMap.set(baseSlug, opp);
      }
      logger.info(`Keyword opportunities: ${kwOpportunities.length} page patterns from Supabase`);

      // Score each matrix candidate: heuristic base + Supabase keyword boost
      for (const page of candidatePages) {
        const { score: baseScore, details: baseDetails } = computeHeuristicScore(page);
        let totalScore = baseScore;
        let details = baseDetails;

        // Match against keyword opportunities
        for (const [baseSlug, opp] of Array.from(oppMap.entries())) {
          if (page.slug.startsWith(baseSlug) || page.slug === baseSlug) {
            // Scale discovered score (0-100) to boost (0-10)
            const boost = Math.round((opp.best_score / 100) * 10);
            totalScore += boost;
            details += `, kw:+${boost}(${opp.keyword_count}kw,best:${opp.best_score})`;
            break;
          }
        }

        scoredPages.push({ ...page, score: totalScore, scoreDetails: details });
      }

      // Add NEW page ideas from keywords not in matrix
      for (const opp of kwOpportunities) {
        if (!opp.suggested_page.startsWith('NEW:')) continue;
        const newSlug = opp.suggested_page
          .replace(/^NEW:\s*/, '')
          .toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

        if (existingSlugs.includes(newSlug)) continue;
        if (scoredPages.some(p => p.slug === newSlug)) continue;

        const kwScore = Math.round((opp.best_score / 100) * 10);
        const modeConfig = getSiteModeConfig(siteKey);
        scoredPages.push({
          siteKey,
          slug: newSlug,
          pageType: 'topic_intent',
          intent: 'guide',
          site: site,
          modeConfig,
          score: 3 + kwScore,
          scoreDetails: `kw-new:${opp.best_score}(${opp.keyword_count}kw: ${opp.top_keywords.slice(0, 3).join(', ')})`,
        });
      }

      // Log top 10
      const topScored = [...scoredPages].sort((a, b) => b.score - a.score).slice(0, 10);
      for (const p of topScored) {
        logger.info(`  [${p.score >= 5 ? 'TOP' : 'OK'}] ${p.slug} — score ${p.score} (${p.scoreDetails})`);
      }

      // 6. Filter score >= 1, limit to PAGES_PER_RUN, sort by score desc
      const qualifiedPages = scoredPages
        .filter(p => p.score >= 1)
        .sort((a, b) => b.score - a.score)
        .slice(0, PAGES_PER_RUN_LOCAL);

      logger.info(`Qualified: ${qualifiedPages.length}/${scoredPages.length}`);

      // 7. Store in pending_pages table
      if (qualifiedPages.length > 0) {
        const pendingRows: PendingPageRow[] = qualifiedPages.map(p => ({
          site_key: siteKey,
          slug: p.slug,
          page_type: p.pageType,
          service_slug: p.service?.slug,
          city_slug: p.city?.slug,
          score: p.score,
          score_details: p.scoreDetails,
          status: 'pending_approval' as const,
          batch_id: batchId,
        }));

        const stored = await upsertPendingPages(pendingRows);
        if (stored === -1) {
          logger.warn('pending_pages table not found — run migration-pending-pages.sql');
        } else {
          logger.success(`Stored ${stored} pages in pending_pages`);

          // 8. Send Telegram approval message
          const { getSupabase } = await import('../db/supabase.js');
          const db = getSupabase();
          const { data: storedPages } = await db
            .from('pending_pages')
            .select('*')
            .eq('site_key', siteKey)
            .eq('batch_id', batchId)
            .eq('status', 'pending_approval')
            .order('score', { ascending: false });

          if (storedPages && storedPages.length > 0) {
            await sendApprovalMessage(siteKey, site.name, storedPages as Array<PendingPageRow & { id: string }>, batchId);
          }
        }
      }

      const duration = Date.now() - siteStart;
      allResults[siteKey] = {
        scored: scoredPages.length,
        pending: qualifiedPages.length,
        queued: queuedForOptimization,
        discovered: 0,
        kwBoosted: kwOpportunities.length,
        errors: 0,
      };

      await log('daily-generate', `Scored ${scoredPages.length}, ${qualifiedPages.length} pending approval`, 'success', siteKey, {
        scored: scoredPages.length,
        pending: qualifiedPages.length,
        queued: queuedForOptimization,
        kwBoosted: kwOpportunities.length,
        batchId,
        topScores: qualifiedPages.slice(0, 5).map(p => ({ slug: p.slug, score: p.score, details: p.scoreDetails })),
      }, duration);

    } catch (e) {
      const errMsg = (e as Error).message;
      logger.error(`Fatal error for ${siteKey}: ${errMsg}`);
      allResults[siteKey] = { scored: 0, pending: 0, queued: 0, discovered: 0, kwBoosted: 0, errors: 1 };
      await log('daily-generate', `Error: ${errMsg}`, 'error', siteKey);
      await notifyError('daily-generate', `${siteKey}: ${errMsg}`, siteKey);
    }
  }

  // Final summary
  const totalDuration = Date.now() - startTime;
  const totalScored = Object.values(allResults).reduce((s, r) => s + r.scored, 0);
  const totalPending = Object.values(allResults).reduce((s, r) => s + r.pending, 0);
  const totalQueued = Object.values(allResults).reduce((s, r) => s + r.queued, 0);
  const totalKwBoosted = Object.values(allResults).reduce((s, r) => s + r.kwBoosted, 0);
  const totalErrors = Object.values(allResults).reduce((s, r) => s + r.errors, 0);

  logger.info('\n=== Summary ===');
  logger.info(`Scored: ${totalScored} | Pending: ${totalPending} | Queued optim: ${totalQueued} | KW-boosted: ${totalKwBoosted} | Errors: ${totalErrors}`);
  logger.info(`Duration: ${(totalDuration / 1000).toFixed(1)}s`);

  for (const [key, r] of Object.entries(allResults)) {
    logger.info(`  ${key}: scored=${r.scored} pending=${r.pending} queue=${r.queued} kw=${r.kwBoosted} err=${r.errors}`);
  }

  await log('daily-generate', 'Completed (scoring only)', 'info', undefined, {
    totalScored, totalPending, totalQueued, totalKwBoosted, totalErrors,
    batchId,
    sites: allResults,
  }, totalDuration);

  return { totalScored, totalPending, totalQueued, totalKwBoosted, totalErrors, batchId, duration: totalDuration, sites: allResults };
}

// Run directly if called as script
const isDirectRun = process.argv[1]?.includes('daily-generate');
if (isDirectRun) {
  dailyGenerate()
    .then(() => {
      logger.success('Daily scoring completed');
      process.exit(0);
    })
    .catch(e => {
      logger.error(`Daily scoring crashed: ${e.message}`);
      notifyError('daily-generate', e.message).finally(() => process.exit(1));
    });
}
