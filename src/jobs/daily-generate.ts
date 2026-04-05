import dotenv from 'dotenv';
dotenv.config();

import { Bot, InlineKeyboard } from 'grammy';
import { sites } from '../../config/sites.js';
import { cities66 } from '../../config/cities-66.js';
import { generateMatrix, PageToGenerate } from '../generators/universal-matrix.js';
import { getSiteModeConfig } from '../../config/site-mode-registry.js';
import { getExistingSlugs, log, addToOptimizationQueue, upsertPendingPages, upsertDiscoveredKeywords, getTopKeywordOpportunities, PendingPageRow, DiscoveredKeywordRow, KeywordOpportunity } from '../db/supabase.js';
import { getExistingSlugsFromFiles } from '../deployers/inject-pages.js';
import { notifyError, sendTelegram } from '../notifications/telegram.js';
import { quickKeywordSuggestions, suggestPages } from '../keywords/research-v2.js';
import { fetchGscData, GscRow } from '../gsc/client.js';
import * as logger from '../utils/logger.js';

const PAGES_PER_RUN = parseInt(process.env.PAGES_PER_RUN || '5', 10);

// Sites exclus du daily-generate
const EXCLUDED_SITES = ['massage'];

// Villes prioritaires pour la découverte de mots-clés
const DISCOVERY_CITIES = ['perpignan', 'narbonne', 'beziers', 'montpellier', 'toulouse'];

// Noms de villes connus pour le bonus scoring
const knownCityNames = new Set(cities66.map(c => c.name.toLowerCase()));

// ─── Scoring ────────────────────────────────────────────────────

interface ScoredPage extends PageToGenerate {
  score: number;
  scoreDetails: string;
}

// Google Suggest availability flag — set to false after first 403 to avoid wasting time
let suggestAvailable: boolean | null = null; // null = not tested yet

/**
 * Test if Google Suggest is reachable from this IP.
 */
async function testSuggestAvailability(): Promise<boolean> {
  try {
    const res = await fetch(
      'https://suggestqueries.google.com/complete/search?client=firefox&hl=fr&gl=fr&q=test',
      { headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' } },
    );
    const text = await res.text();
    const ok = !text.startsWith('<') && res.status === 200;
    logger.info(`Google Suggest availability: ${ok ? '✅ available' : '❌ blocked (IP banned)'}`);
    return ok;
  } catch {
    logger.info('Google Suggest availability: ❌ unreachable');
    return false;
  }
}

/**
 * Score composite pour une page candidate.
 * Mode suggest: utilise Google Suggest count + bonuses
 * Mode heuristique: utilise zone géo + type de page + service keywords
 */
function computeCompositeScore(suggestCount: number, keywords: string[]): { score: number; details: string } {
  let score = Math.min(suggestCount, 10);
  const parts: string[] = [`suggest:${suggestCount}`];
  const allText = keywords.join(' ').toLowerCase();

  if (/prix|tarif|devis|combien/.test(allText)) {
    score += 2;
    parts.push('transac:+2');
  }
  if (/urgent|nuit|dimanche|24h/.test(allText)) {
    score += 2;
    parts.push('urgence:+2');
  }
  if (/avis|meilleur|recommand/.test(allText)) {
    score += 1;
    parts.push('trust:+1');
  }
  const mentionsCity = keywords.some(kw => {
    const lower = kw.toLowerCase();
    return Array.from(knownCityNames).some(city => lower.includes(city));
  });
  if (mentionsCity) {
    score += 1;
    parts.push('city:+1');
  }

  return { score, details: parts.join(', ') };
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

function scoreKeyword(keyword: string, suggestCount: number): number {
  let score = Math.min(suggestCount, 10);
  const lower = keyword.toLowerCase();
  if (/prix|tarif|devis|combien/.test(lower)) score += 2;
  if (/urgent|nuit|dimanche|24h/.test(lower)) score += 2;
  if (/avis|meilleur|recommand/.test(lower)) score += 1;
  if (Array.from(knownCityNames).some(city => lower.includes(city))) score += 1;
  return score;
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

// ─── Keyword Discovery ──────────────────────────────────────────

async function discoverKeywords(
  siteKey: string,
  topic: string,
  existingSlugs: string[],
  matrixSlugs: string[],
): Promise<{ discovered: Array<{ title: string; targetKeywords: string[]; type: string; score: number }>; keywords: DiscoveredKeywordRow[] }> {
  const allDiscovered: Array<{ title: string; targetKeywords: string[]; type: string; score: number }> = [];
  const allKeywordRows: DiscoveredKeywordRow[] = [];
  const allKnown = new Set([...existingSlugs, ...matrixSlugs]);

  for (const city of DISCOVERY_CITIES) {
    try {
      const rawKeywords = await quickKeywordSuggestions(topic, city, '66');
      const keywords = rawKeywords.map(k => ({ ...k, source: 'suggest' }));
      const pages = suggestPages(keywords, topic, city);

      for (const page of pages) {
        const suggestedSlug = page.title
          .toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

        if (!allKnown.has(suggestedSlug)) {
          const compositeScore = scoreKeyword(page.title, page.targetKeywords.length);
          allDiscovered.push({ ...page, score: compositeScore });
          allKnown.add(suggestedSlug);
        }

        for (const kw of page.targetKeywords) {
          allKeywordRows.push({
            site_key: siteKey,
            keyword: kw,
            score: scoreKeyword(kw, 1),
            source: `discovery:${city}`,
            suggested_page: page.title,
          });
        }
      }

      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      logger.warn(`Keyword discovery failed for ${topic} + ${city}: ${(e as Error).message}`);
    }
  }

  return { discovered: allDiscovered, keywords: allKeywordRows };
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

      // 5. Score each candidate page
      // Test Google Suggest availability once per run
      if (suggestAvailable === null) {
        suggestAvailable = await testSuggestAvailability();
      }

      const scoringMode = suggestAvailable ? 'suggest' : 'heuristic';
      logger.info(`Scoring ${candidatePages.length} candidates (mode: ${scoringMode})...`);
      const scoredPages: ScoredPage[] = [];

      if (suggestAvailable) {
        // Google Suggest mode: sequential with 500ms delay
        for (const page of candidatePages) {
          const topic = page.service?.name || page.site.business.split(' - ')[0];
          const location = page.city?.name || 'Perpignan';

          try {
            const suggestions = await quickKeywordSuggestions(topic, location, '66');
            // If first call returns 0 results, Suggest may have just been blocked
            if (suggestions.length === 0 && scoredPages.length === 0) {
              const recheck = await testSuggestAvailability();
              if (!recheck) {
                suggestAvailable = false;
                logger.warn('Google Suggest just got blocked — switching to heuristic mode');
                // Score this page + all remaining with heuristic
                const { score, details } = computeHeuristicScore(page);
                scoredPages.push({ ...page, score, scoreDetails: details });
                break;
              }
            }
            const keywordsText = suggestions.map(s => s.keyword);
            const { score, details } = computeCompositeScore(suggestions.length, keywordsText);
            scoredPages.push({ ...page, score, scoreDetails: details });
            logger.info(`  [${score >= 1 ? 'OK' : 'LOW'}] ${page.slug} — score ${score} (${details})`);
            await new Promise(r => setTimeout(r, 500));
          } catch (e) {
            scoredPages.push({ ...page, score: 0, scoreDetails: 'error' });
            logger.warn(`  [ERR] ${page.slug} — ${(e as Error).message}`);
          }
        }
      }

      if (!suggestAvailable) {
        // Heuristic mode: instant scoring, no API calls
        const alreadyScored = new Set(scoredPages.map(p => p.slug));
        for (const page of candidatePages) {
          if (alreadyScored.has(page.slug)) continue;
          const { score, details } = computeHeuristicScore(page);
          scoredPages.push({ ...page, score, scoreDetails: details });
        }
        // Log top 10 only to avoid spam
        const topHeuristic = [...scoredPages].sort((a, b) => b.score - a.score).slice(0, 10);
        for (const p of topHeuristic) {
          logger.info(`  [HEUR] ${p.slug} — score ${p.score} (${p.scoreDetails})`);
        }
      }

      // 5b. Boost scores with discovered_keywords opportunities
      let kwOpportunities: KeywordOpportunity[] = [];
      try {
        kwOpportunities = await getTopKeywordOpportunities(siteKey, 50);
        if (kwOpportunities.length > 0) {
          logger.info(`Discovered keywords: ${kwOpportunities.length} page opportunities found`);

          // Build a map: normalized slug pattern → opportunity
          const oppMap = new Map<string, KeywordOpportunity>();
          for (const opp of kwOpportunities) {
            // Handle patterns like "entretien-[ville]" → match any "entretien-*" slug
            const baseSlug = opp.suggested_page
              .replace(/^NEW:\s*/, '')
              .replace(/\[ville\]/g, '')
              .replace(/-+$/g, '')
              .toLowerCase();
            oppMap.set(baseSlug, opp);
          }

          // Boost matrix candidates that match keyword opportunities
          for (const page of scoredPages) {
            for (const [baseSlug, opp] of Array.from(oppMap.entries())) {
              if (page.slug.startsWith(baseSlug) || page.slug === baseSlug) {
                // Normalize discovered score (0-100) to a boost (0-5)
                const boost = Math.round((opp.best_score / 100) * 5);
                page.score += boost;
                page.scoreDetails += `, kw-boost:+${boost}(${opp.keyword_count}kw,best:${opp.best_score})`;
                logger.info(`  [KW-BOOST] ${page.slug} +${boost} (${opp.keyword_count} keywords, best: ${opp.best_score})`);
                break;
              }
            }
          }

          // Add NEW page ideas not in matrix as extra candidates
          for (const opp of kwOpportunities) {
            if (!opp.suggested_page.startsWith('NEW:')) continue;
            const newSlug = opp.suggested_page
              .replace(/^NEW:\s*/, '')
              .toLowerCase()
              .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '');

            // Skip if already in matrix or existing
            if (existingSlugs.includes(newSlug)) continue;
            if (scoredPages.some(p => p.slug === newSlug)) continue;

            const boost = Math.round((opp.best_score / 100) * 5);
            const modeConfig = getSiteModeConfig(siteKey);
            const newPage: ScoredPage = {
              siteKey,
              slug: newSlug,
              pageType: 'topic_intent',
              intent: 'guide',
              site: site,
              modeConfig,
              score: 3 + boost, // base 3 + keyword boost
              scoreDetails: `kw-new:${opp.best_score}(${opp.keyword_count}kw: ${opp.top_keywords.slice(0, 3).join(', ')})`,
            };
            scoredPages.push(newPage);
            logger.info(`  [KW-NEW] ${newSlug} — score ${newPage.score} (${opp.keyword_count} keywords)`);
          }
        }
      } catch (e) {
        logger.warn(`Keyword opportunities fetch failed: ${(e as Error).message}`);
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
          // Re-fetch to get the UUIDs
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

      // 9. Keyword discovery (skip if Suggest is blocked)
      let discoveredCount = 0;
      if (!suggestAvailable) {
        logger.info('Skipping keyword discovery (Google Suggest blocked)');
      } else try {
        const topic = site.business.split(' - ')[0].toLowerCase();
        const matrixSlugs = matrix.map(p => p.slug);
        const { discovered, keywords: kwRows } = await discoverKeywords(siteKey, topic, existingSlugs, matrixSlugs);

        if (kwRows.length > 0) {
          const stored = await upsertDiscoveredKeywords(kwRows);
          if (stored === -1) {
            logger.warn('discovered_keywords table not found');
          } else {
            discoveredCount = stored;
            logger.info(`Discovery: ${kwRows.length} keywords, ${discovered.length} page ideas`);
          }
        }

        if (discovered.length > 0) {
          const topDisc = discovered.sort((a, b) => b.score - a.score).slice(0, 5);
          const discMsg = topDisc.map(d => `  • ${d.title} (score: ${d.score})`).join('\n');
          await sendTelegram(
            `<b>🔍 Mots-clés découverts — ${siteKey}</b>\n\n` +
            `${discovered.length} idées de pages:\n${discMsg}\n\n` +
            `${kwRows.length} mots-clés stockés`,
            siteKey
          );
        }
      } catch (e) {
        logger.warn(`Discovery failed for ${siteKey}: ${(e as Error).message}`);
      }

      const duration = Date.now() - siteStart;
      const kwBoostedCount = kwOpportunities.length;
      allResults[siteKey] = {
        scored: scoredPages.length,
        pending: qualifiedPages.length,
        queued: queuedForOptimization,
        discovered: discoveredCount,
        kwBoosted: kwBoostedCount,
        errors: 0,
      };

      await log('daily-generate', `Scored ${scoredPages.length}, ${qualifiedPages.length} pending approval`, 'success', siteKey, {
        scored: scoredPages.length,
        pending: qualifiedPages.length,
        queued: queuedForOptimization,
        discovered: discoveredCount,
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
  const totalDiscovered = Object.values(allResults).reduce((s, r) => s + r.discovered, 0);
  const totalErrors = Object.values(allResults).reduce((s, r) => s + r.errors, 0);

  logger.info('\n=== Summary ===');
  logger.info(`Scored: ${totalScored} | Pending approval: ${totalPending} | Queued optim: ${totalQueued} | Discovered: ${totalDiscovered} | Errors: ${totalErrors}`);
  logger.info(`Duration: ${(totalDuration / 1000).toFixed(1)}s`);

  for (const [key, r] of Object.entries(allResults)) {
    logger.info(`  ${key}: scored=${r.scored} pending=${r.pending} queue=${r.queued} disc=${r.discovered} err=${r.errors}`);
  }

  await log('daily-generate', 'Completed (scoring only)', 'info', undefined, {
    totalScored, totalPending, totalQueued, totalDiscovered, totalErrors,
    batchId,
    sites: allResults,
  }, totalDuration);

  return { totalScored, totalPending, totalQueued, totalDiscovered, totalErrors, batchId, duration: totalDuration, sites: allResults };
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
