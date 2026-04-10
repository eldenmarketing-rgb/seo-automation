import dotenv from 'dotenv';
dotenv.config();

import Anthropic from '@anthropic-ai/sdk';
import { sites, ServiceDef } from '../../config/sites.js';
import { generateMatrix, PageToGenerate } from '../generators/universal-matrix.js';
import { getSiteModeConfig } from '../../config/site-mode-registry.js';
import {
  getExistingSlugs, log, upsertPendingPages, getPageKeywordScores,
  PageKeywordScore, PendingPageRow, upsertDiscoveredKeywords,
  DiscoveredKeywordRow, countKeywordsByService,
} from '../db/supabase.js';
import { getExistingSlugsFromFiles } from '../deployers/inject-pages.js';
import { getSearchVolume, KeywordData } from '../keywords/dataforseo.js';
import { notifyError } from '../notifications/telegram.js';
import * as logger from '../utils/logger.js';

const PAGES_PER_RUN = parseInt(process.env.PAGES_PER_RUN || '5', 10);

// Sites exclus du daily-generate
const EXCLUDED_SITES = ['massage'];

// Auto-discovery limits
const MAX_SERVICES_PER_RUN = 3;
const MAX_DATAFORSEO_CALLS_PER_RUN = 5;
const MIN_KEYWORDS_THRESHOLD = 10;


// ─── Auto-Discovery: Claude Seeds + DataForSEO ──────────────

let anthropicClient: Anthropic | null = null;
function getAnthropicClient(): Anthropic {
  if (!anthropicClient) anthropicClient = new Anthropic();
  return anthropicClient;
}

/**
 * Ask Claude for 10 smart seed keywords that real customers type on Google.
 */
async function generateSeedsWithClaude(
  siteKey: string,
  siteName: string,
  service: ServiceDef,
): Promise<string[]> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `Tu es expert SEO dans la niche "${siteName}" (${siteKey}). Pour le service "${service.name}" (mots-clés existants : ${service.keywords.join(', ')}), donne-moi 10 seeds de recherche que les clients tapent vraiment sur Google en France. SANS nom de ville, uniquement des termes génériques nationaux. Français uniquement. Réponds UNIQUEMENT en JSON : ["seed1", "seed2", ...]`,
    }],
  });

  // Extract JSON from response
  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\[[\s\S]*?\]/);
  if (!jsonMatch) {
    logger.warn(`Claude returned non-JSON for ${service.slug}: ${text.slice(0, 100)}`);
    // Fallback: use service keywords as seeds
    return service.keywords.slice(0, 10);
  }

  try {
    const seeds = JSON.parse(jsonMatch[0]) as string[];
    return seeds.filter(s => typeof s === 'string' && s.length > 0).slice(0, 10);
  } catch {
    logger.warn(`Failed to parse Claude JSON for ${service.slug}`);
    return service.keywords.slice(0, 10);
  }
}

/**
 * Score a newly discovered keyword (0-100) based on volume, CPC, competition.
 */
function computeDiscoveryScore(kw: KeywordData): number {
  let score = 0;

  // Volume (0-40)
  if (kw.searchVolume >= 1000) score += 40;
  else if (kw.searchVolume >= 500) score += 35;
  else if (kw.searchVolume >= 200) score += 30;
  else if (kw.searchVolume >= 100) score += 25;
  else if (kw.searchVolume >= 50) score += 20;
  else if (kw.searchVolume >= 20) score += 15;
  else if (kw.searchVolume >= 10) score += 10;
  else score += 5;

  // CPC (0-25)
  if (kw.cpc && kw.cpc >= 5) score += 25;
  else if (kw.cpc && kw.cpc >= 3) score += 20;
  else if (kw.cpc && kw.cpc >= 1.5) score += 15;
  else if (kw.cpc && kw.cpc >= 0.5) score += 10;
  else if (kw.cpc && kw.cpc > 0) score += 5;

  // Competition inversée (0-20)
  if (kw.competition === 'LOW') score += 20;
  else if (kw.competition === 'MEDIUM') score += 12;
  else if (kw.competition === 'HIGH') score += 5;

  // Bonus intention transactionnelle (0-15)
  const k = kw.keyword.toLowerCase();
  if (/prix|tarif|co[uû]t|devis/.test(k)) score += 15;
  else if (/urgent|nuit|dimanche|24h/.test(k)) score += 15;
  else if (/avis|meilleur|comparatif/.test(k)) score += 10;

  return Math.min(score, 100);
}

/**
 * Expand Claude seeds with common SEO variations.
 * Returns deduped list of keywords to send to getSearchVolume.
 */
function expandSeeds(seeds: string[], serviceName: string): string[] {
  const variations = new Set<string>();

  for (const seed of seeds) {
    variations.add(seed.toLowerCase());
  }

  // Add "prix/tarif/avis" variants for the service name
  const base = serviceName.toLowerCase();
  for (const prefix of ['prix', 'tarif', 'avis', 'meilleur']) {
    variations.add(`${prefix} ${base}`);
  }
  for (const suffix of ['pas cher', 'prix', 'devis gratuit']) {
    variations.add(`${base} ${suffix}`);
  }

  return [...variations];
}

interface DiscoveryResult {
  servicesProcessed: number;
  keywordsDiscovered: number;
  dataforseoCalls: number;
  details: Array<{ siteKey: string; service: string; seeds: string[]; keywords: number }>;
}

/**
 * Auto-discover keywords for services that have < 10 keywords in discovered_keywords.
 * Uses Claude for smart seed generation + DataForSEO for keyword expansion.
 *
 * Limits: max 3 services per run, max 5 DataForSEO calls per run.
 */
async function autoDiscoverKeywords(dryRun: boolean): Promise<DiscoveryResult> {
  const result: DiscoveryResult = { servicesProcessed: 0, keywordsDiscovered: 0, dataforseoCalls: 0, details: [] };

  // Check DataForSEO credentials
  if (!process.env.DATAFORSEO_LOGIN || !process.env.DATAFORSEO_PASSWORD) {
    logger.warn('Auto-discovery: DataForSEO not configured, skipping');
    return result;
  }

  logger.info('\n=== Auto-Discovery Phase ===');

  // Collect all services needing discovery across all sites
  const servicesToDiscover: Array<{ siteKey: string; siteName: string; business: string; service: ServiceDef; currentCount: number }> = [];

  for (const [siteKey, site] of Object.entries(sites)) {
    if (EXCLUDED_SITES.includes(siteKey)) continue;

    const serviceSlugs = site.services.map(s => s.slug);
    const counts = await countKeywordsByService(siteKey, serviceSlugs);

    for (const service of site.services) {
      const count = counts.get(service.slug) || 0;
      if (count < MIN_KEYWORDS_THRESHOLD) {
        servicesToDiscover.push({
          siteKey,
          siteName: site.name,
          business: site.business,
          service,
          currentCount: count,
        });
      }
    }
  }

  if (servicesToDiscover.length === 0) {
    logger.info('Auto-discovery: all services have >= 10 keywords');
    return result;
  }

  // Sort: fewest keywords first (most urgent), then by site
  servicesToDiscover.sort((a, b) => a.currentCount - b.currentCount);

  logger.info(`Auto-discovery: ${servicesToDiscover.length} services need keywords (processing max ${MAX_SERVICES_PER_RUN})`);
  for (const s of servicesToDiscover.slice(0, 10)) {
    logger.info(`  ${s.siteKey}/${s.service.slug}: ${s.currentCount} keywords`);
  }

  // Process up to MAX_SERVICES_PER_RUN
  for (const entry of servicesToDiscover.slice(0, MAX_SERVICES_PER_RUN)) {
    if (result.dataforseoCalls >= MAX_DATAFORSEO_CALLS_PER_RUN) {
      logger.warn('Auto-discovery: DataForSEO call limit reached, stopping');
      break;
    }

    const svcLabel = `${entry.siteKey}/${entry.service.slug}`;
    logger.info(`\n  [DISCOVER] ${svcLabel} (${entry.currentCount} existing keywords)`);

    try {
      // Step 1: Claude generates 10 smart seeds
      logger.info(`    Asking Claude for seeds...`);
      const seeds = await generateSeedsWithClaude(entry.siteKey, entry.siteName, entry.service);
      logger.info(`    Claude seeds (${seeds.length}): ${seeds.join(' | ')}`);

      if (dryRun) {
        logger.info('    [DRY RUN] Would call DataForSEO with these seeds');
        result.details.push({ siteKey: entry.siteKey, service: entry.service.slug, seeds, keywords: 0 });
        result.servicesProcessed++;
        continue;
      }

      // Step 2: Expand seeds + DataForSEO getSearchVolume (exact volumes)
      // Seeds are national (no city) — Claude generated them, all are relevant by construction
      if (result.dataforseoCalls >= MAX_DATAFORSEO_CALLS_PER_RUN) {
        logger.warn('    DataForSEO call limit reached, skipping');
        result.details.push({ siteKey: entry.siteKey, service: entry.service.slug, seeds, keywords: 0 });
        result.servicesProcessed++;
        continue;
      }

      const allKeywords = expandSeeds(seeds, entry.service.name);
      logger.info(`    Seeds expanded: ${seeds.length} → ${allKeywords.length} keywords`);

      logger.info(`    DataForSEO getSearchVolume: ${allKeywords.length} keywords`);
      const volumeMap = await getSearchVolume(allKeywords);
      result.dataforseoCalls++;

      // Filter: keep only keywords with volume > 0
      const ideas: KeywordData[] = [];
      for (const [, kwData] of volumeMap) {
        if (kwData.searchVolume > 0) ideas.push(kwData);
      }
      ideas.sort((a, b) => b.searchVolume - a.searchVolume);

      logger.info(`    DataForSEO: ${allKeywords.length} queried → ${ideas.length} with volume > 0`);

      if (ideas.length === 0) {
        result.details.push({ siteKey: entry.siteKey, service: entry.service.slug, seeds, keywords: 0 });
        result.servicesProcessed++;
        continue;
      }

      // Step 3: Build suggested_page slug (service-perpignan as default)
      const suggestedPage = `${entry.service.slug}-perpignan`;

      // Step 4: Store in discovered_keywords
      const rows: DiscoveredKeywordRow[] = ideas.map(kw => ({
        site_key: entry.siteKey,
        keyword: kw.keyword,
        score: computeDiscoveryScore(kw),
        source: 'auto-discovery',
        suggested_page: suggestedPage,
        status: 'new' as const,
        volume: kw.searchVolume,
        cpc: kw.cpc || 0,
        competition: kw.competition || '',
      }));

      const stored = await upsertDiscoveredKeywords(rows);
      const storedCount = stored === -1 ? 0 : stored;
      result.keywordsDiscovered += storedCount;
      result.servicesProcessed++;
      result.details.push({ siteKey: entry.siteKey, service: entry.service.slug, seeds, keywords: storedCount });

      logger.success(`    Stored ${storedCount} keywords for ${svcLabel}`);

      // Log to Supabase
      await log('auto-discovery', `${svcLabel}: ${storedCount} keywords from ${seeds.length} seeds`, 'success', entry.siteKey, {
        service: entry.service.slug,
        seeds,
        ideasReturned: ideas.length,
        stored: storedCount,
        topKeywords: ideas.slice(0, 5).map(kw => ({ kw: kw.keyword, vol: kw.searchVolume })),
      });

    } catch (e) {
      const errMsg = (e as Error).message;
      logger.error(`    Discovery failed for ${svcLabel}: ${errMsg}`);
      await log('auto-discovery', `${svcLabel}: ${errMsg}`, 'error', entry.siteKey);
    }
  }

  logger.info(`\nAuto-discovery done: ${result.servicesProcessed} services | ${result.keywordsDiscovered} keywords | ${result.dataforseoCalls} DataForSEO calls`);

  return result;
}


// ─── Scoring Supabase-only ──────────────────────────────────

interface ScoredPage extends PageToGenerate {
  score: number;
  totalVolume: number;
  avgKd: number;
  avgCpc: number;
  keywordCount: number;
  scoreDetails: string;
}


/**
 * Match a matrix page slug against discovered_keywords suggested_page entries.
 * Handles patterns like "vidange-perpignan" matching "vidange-perpignan" or partial prefixes.
 */
function findKeywordMatch(slug: string, kwScores: Map<string, PageKeywordScore>): PageKeywordScore | undefined {
  // Exact match
  if (kwScores.has(slug)) return kwScores.get(slug);

  // Try base service slug matching (e.g. page "vidange-canet-en-roussillon" → match "vidange-perpignan" base "vidange")
  const slugParts = slug.split('-');
  for (const [kwSlug, kwScore] of kwScores) {
    const kwBase = kwSlug.split('-').slice(0, -1).join('-'); // Remove city from suggested_page
    const pageBase = slugParts.slice(0, -1).join('-');       // Remove city from page slug

    // Service base matches (e.g. both start with "vidange" or "climatisation-auto")
    if (kwBase && pageBase && kwBase === pageBase) return kwScore;
  }

  return undefined;
}


// ─── Telegram Summary with Inline Keyboards ─────────────────

/**
 * Send a Telegram message with scored pages and approval buttons.
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

  for (const p of top.slice(0, 8)) {
    keyboard.push([
      { text: `✅ ${p.slug.slice(0, 25)}`, callback_data: `pa:${p.id}` },
      { text: `❌`, callback_data: `pr:${p.id}` },
    ]);
  }

  keyboard.push([
    { text: `✅ Tout valider (${pages.length})`, callback_data: `paa:${siteKey}` },
    { text: `❌ Tout rejeter`, callback_data: `pra:${siteKey}` },
  ]);

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

// ─── Main Job — Auto-Discover → Score → Store ───────────────

export async function dailyGenerate(pagesPerRunOverride?: number, dryRun = false) {
  const PAGES_PER_RUN_LOCAL = pagesPerRunOverride ?? PAGES_PER_RUN;
  const startTime = Date.now();
  const batchId = `batch-${new Date().toISOString().slice(0, 10)}-${Date.now().toString(36)}`;

  logger.info('=== Daily SEO Pipeline (Auto-Discover → Score → Store) ===');
  logger.info(`Target: ${PAGES_PER_RUN_LOCAL} pages per site`);
  if (dryRun) logger.info('MODE: DRY RUN — no writes');
  logger.info(`Batch: ${batchId}`);
  logger.info(`Excluded sites: ${EXCLUDED_SITES.join(', ')}`);

  // ─── Phase 1: Auto-Discovery ────────────────────────────────
  let discovery: DiscoveryResult = { servicesProcessed: 0, keywordsDiscovered: 0, dataforseoCalls: 0, details: [] };
  try {
    discovery = await autoDiscoverKeywords(dryRun);
  } catch (e) {
    logger.error(`Auto-discovery crashed: ${(e as Error).message}`);
  }

  // ─── Phase 2: Scoring & Pending Pages ───────────────────────
  const allResults: Record<string, { scored: number; pending: number; errors: number }> = {};

  for (const [siteKey, site] of Object.entries(sites)) {
    if (EXCLUDED_SITES.includes(siteKey)) {
      logger.info(`\n--- Skipping ${siteKey} (excluded) ---`);
      allResults[siteKey] = { scored: 0, pending: 0, errors: 0 };
      continue;
    }

    const siteStart = Date.now();
    logger.info(`\n--- Scoring ${siteKey} (${site.name}) ---`);

    try {
      // 1. Get all possible pages from matrix
      const matrix = generateMatrix(siteKey);
      logger.info(`Matrix: ${matrix.length} total pages possible`);

      // 2. Get already existing slugs (Supabase + site data files)
      const supabaseSlugs = await getExistingSlugs(siteKey);
      const fileSlugs = getExistingSlugsFromFiles(siteKey);
      const existingSlugs = new Set([...supabaseSlugs, ...fileSlugs]);
      logger.info(`Existing: ${existingSlugs.size} unique`);

      // 3. Filter out existing pages
      const candidatePages = matrix.filter(p => !existingSlugs.has(p.slug));
      logger.info(`Candidates: ${candidatePages.length}`);

      if (candidatePages.length === 0) {
        allResults[siteKey] = { scored: 0, pending: 0, errors: 0 };
        continue;
      }

      // 4. Fetch keyword scores from Supabase — ZERO external API calls
      const kwScoresRaw = await getPageKeywordScores(siteKey);
      const kwScores = new Map<string, PageKeywordScore>();
      for (const ks of kwScoresRaw) {
        kwScores.set(ks.suggested_page, ks);
      }
      logger.info(`Keyword data: ${kwScores.size} page patterns from discovered_keywords`);

      // 5. Score each candidate: volume DESC, KD ASC
      const scoredPages: ScoredPage[] = [];

      for (const page of candidatePages) {
        const match = findKeywordMatch(page.slug, kwScores);

        if (!match) continue; // No keyword data → skip (Supabase-only = no guessing)

        // Score formula: volume drives priority, KD penalizes
        const volumeScore = Math.round(match.total_volume / 1000);
        const kdPenalty = Math.round(match.avg_kd / 10);
        const score = Math.max(1, volumeScore - kdPenalty);

        const details = `vol:${match.total_volume} kd:${match.avg_kd} cpc:${match.avg_cpc}€ kw:${match.keyword_count}`;

        scoredPages.push({
          ...page,
          score,
          totalVolume: match.total_volume,
          avgKd: match.avg_kd,
          avgCpc: match.avg_cpc,
          keywordCount: match.keyword_count,
          scoreDetails: details,
        });
      }

      // 6. Sort: volume DESC, KD ASC, city population DESC (tiebreaker)
      scoredPages.sort((a, b) =>
        b.totalVolume - a.totalVolume ||
        a.avgKd - b.avgKd ||
        (b.city?.population || 0) - (a.city?.population || 0)
      );

      // 7. Take top N
      const qualifiedPages = scoredPages.slice(0, PAGES_PER_RUN_LOCAL);

      // Log top 10
      const topDisplay = scoredPages.slice(0, 10);
      for (const [i, p] of topDisplay.entries()) {
        logger.info(`  ${i + 1}. ${p.slug} — score ${p.score} (${p.scoreDetails})`);
      }
      logger.info(`Total scored: ${scoredPages.length} | Qualified: ${qualifiedPages.length}`);

      if (dryRun) {
        allResults[siteKey] = { scored: scoredPages.length, pending: qualifiedPages.length, errors: 0 };
        continue;
      }

      // 8. Store in pending_pages table
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

          // 9. Send Telegram approval message
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
        errors: 0,
      };

      await log('daily-generate', `Scored ${scoredPages.length}, ${qualifiedPages.length} pending approval`, 'success', siteKey, {
        scored: scoredPages.length,
        pending: qualifiedPages.length,
        batchId,
        topScores: qualifiedPages.slice(0, 5).map(p => ({ slug: p.slug, score: p.score, volume: p.totalVolume, kd: p.avgKd, details: p.scoreDetails })),
      }, duration);

    } catch (e) {
      const errMsg = (e as Error).message;
      logger.error(`Fatal error for ${siteKey}: ${errMsg}`);
      allResults[siteKey] = { scored: 0, pending: 0, errors: 1 };
      await log('daily-generate', `Error: ${errMsg}`, 'error', siteKey);
      await notifyError('daily-generate', `${siteKey}: ${errMsg}`, siteKey);
    }
  }

  // Final summary
  const totalDuration = Date.now() - startTime;
  const totalScored = Object.values(allResults).reduce((s, r) => s + r.scored, 0);
  const totalPending = Object.values(allResults).reduce((s, r) => s + r.pending, 0);
  const totalErrors = Object.values(allResults).reduce((s, r) => s + r.errors, 0);

  logger.info('\n=== Summary ===');
  logger.info(`Discovery: ${discovery.servicesProcessed} services, ${discovery.keywordsDiscovered} keywords, ${discovery.dataforseoCalls} API calls`);
  logger.info(`Scoring: ${totalScored} scored | ${totalPending} pending | ${totalErrors} errors`);
  logger.info(`Duration: ${(totalDuration / 1000).toFixed(1)}s`);

  for (const [key, r] of Object.entries(allResults)) {
    logger.info(`  ${key}: scored=${r.scored} pending=${r.pending} err=${r.errors}`);
  }

  if (!dryRun) {
    await log('daily-generate', 'Completed', 'info', undefined, {
      discovery: {
        services: discovery.servicesProcessed,
        keywords: discovery.keywordsDiscovered,
        calls: discovery.dataforseoCalls,
        details: discovery.details,
      },
      scoring: { totalScored, totalPending, totalErrors },
      batchId,
      sites: allResults,
    }, totalDuration);
  }

  return {
    discovery,
    totalScored, totalPending, totalErrors,
    batchId, duration: totalDuration, sites: allResults,
  };
}

// Run directly if called as script
const isDirectRun = process.argv[1]?.includes('daily-generate');
if (isDirectRun) {
  const dryRun = process.argv.includes('--dry-run');
  dailyGenerate(undefined, dryRun)
    .then(() => {
      logger.success('Daily pipeline completed');
      process.exit(0);
    })
    .catch(e => {
      logger.error(`Daily pipeline crashed: ${e.message}`);
      notifyError('daily-generate', e.message).finally(() => process.exit(1));
    });
}
