import dotenv from 'dotenv';
dotenv.config();

import Anthropic from '@anthropic-ai/sdk';
import { sites, ServiceDef } from '../../config/sites.js';
import { getSiteModeConfig } from '../../config/site-mode-registry.js';
import { UniversalPage } from '../../config/site-modes.js';
import { intentToPageIntent } from '../keywords/intent-classifier.js';
import type { SearchIntent } from '../keywords/intent-classifier.js';
import {
  getSupabase, log, upsertSeoPage, upsertDiscoveredKeywords,
  DiscoveredKeywordRow, countKeywordsByService, KeywordClusterRow,
} from '../db/supabase.js';
import { generatePageContent } from '../generators/page-generator-v2.js';
import { getSearchVolume, KeywordData } from '../keywords/dataforseo.js';
import { filterCannibalized } from '../qa/cannibalization.js';
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

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\[[\s\S]*?\]/);
  if (!jsonMatch) {
    logger.warn(`Claude returned non-JSON for ${service.slug}: ${text.slice(0, 100)}`);
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
 */
function expandSeeds(seeds: string[], serviceName: string): string[] {
  const variations = new Set<string>();

  for (const seed of seeds) {
    variations.add(seed.toLowerCase());
  }

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
 */
async function autoDiscoverKeywords(dryRun: boolean): Promise<DiscoveryResult> {
  const result: DiscoveryResult = { servicesProcessed: 0, keywordsDiscovered: 0, dataforseoCalls: 0, details: [] };

  if (!process.env.DATAFORSEO_LOGIN || !process.env.DATAFORSEO_PASSWORD) {
    logger.warn('Auto-discovery: DataForSEO not configured, skipping');
    return result;
  }

  logger.info('\n=== Phase 1: Auto-Discovery ===');

  const servicesToDiscover: Array<{ siteKey: string; siteName: string; business: string; service: ServiceDef; currentCount: number }> = [];

  for (const [siteKey, site] of Object.entries(sites)) {
    if (EXCLUDED_SITES.includes(siteKey)) continue;

    const serviceSlugs = site.services.map(s => s.slug);
    const counts = await countKeywordsByService(siteKey, serviceSlugs);

    for (const service of site.services) {
      const count = counts.get(service.slug) || 0;
      if (count < MIN_KEYWORDS_THRESHOLD) {
        servicesToDiscover.push({ siteKey, siteName: site.name, business: site.business, service, currentCount: count });
      }
    }
  }

  if (servicesToDiscover.length === 0) {
    logger.info('Auto-discovery: all services have >= 10 keywords');
    return result;
  }

  servicesToDiscover.sort((a, b) => a.currentCount - b.currentCount);
  logger.info(`Auto-discovery: ${servicesToDiscover.length} services need keywords (processing max ${MAX_SERVICES_PER_RUN})`);

  for (const entry of servicesToDiscover.slice(0, MAX_SERVICES_PER_RUN)) {
    if (result.dataforseoCalls >= MAX_DATAFORSEO_CALLS_PER_RUN) break;

    const svcLabel = `${entry.siteKey}/${entry.service.slug}`;
    logger.info(`\n  [DISCOVER] ${svcLabel} (${entry.currentCount} existing keywords)`);

    try {
      const seeds = await generateSeedsWithClaude(entry.siteKey, entry.siteName, entry.service);
      logger.info(`    Claude seeds (${seeds.length}): ${seeds.join(' | ')}`);

      if (dryRun) {
        result.details.push({ siteKey: entry.siteKey, service: entry.service.slug, seeds, keywords: 0 });
        result.servicesProcessed++;
        continue;
      }

      if (result.dataforseoCalls >= MAX_DATAFORSEO_CALLS_PER_RUN) {
        result.details.push({ siteKey: entry.siteKey, service: entry.service.slug, seeds, keywords: 0 });
        result.servicesProcessed++;
        continue;
      }

      const allKeywords = expandSeeds(seeds, entry.service.name);
      const volumeMap = await getSearchVolume(allKeywords);
      result.dataforseoCalls++;

      const ideas: KeywordData[] = [];
      for (const [, kwData] of volumeMap) {
        if (kwData.searchVolume > 0) ideas.push(kwData);
      }
      ideas.sort((a, b) => b.searchVolume - a.searchVolume);

      if (ideas.length === 0) {
        result.details.push({ siteKey: entry.siteKey, service: entry.service.slug, seeds, keywords: 0 });
        result.servicesProcessed++;
        continue;
      }

      const suggestedPage = `${entry.service.slug}-perpignan`;
      const { classifyIntent } = await import('../keywords/intent-classifier.js');
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
        intent_type: kw.intent || classifyIntent(kw.keyword),
      }));

      const stored = await upsertDiscoveredKeywords(rows);
      const storedCount = stored === -1 ? 0 : stored;
      result.keywordsDiscovered += storedCount;
      result.servicesProcessed++;
      result.details.push({ siteKey: entry.siteKey, service: entry.service.slug, seeds, keywords: storedCount });

      logger.success(`    Stored ${storedCount} keywords for ${svcLabel}`);
      await log('auto-discovery', `${svcLabel}: ${storedCount} keywords from ${seeds.length} seeds`, 'success', entry.siteKey, {
        service: entry.service.slug, seeds, ideasReturned: ideas.length, stored: storedCount,
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


// ─── Phase 2: Generate from Approved Clusters ────────────────

/**
 * Fetch clusters with status='approved' from keyword_clusters.
 * These are the clusters approved via the SEO dashboard pipeline.
 */
async function getApprovedClusters(limit: number): Promise<KeywordClusterRow[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from('keyword_clusters')
    .select('*')
    .eq('status', 'approved')
    .order('total_volume', { ascending: false })
    .limit(limit);

  if (error) {
    if (error.message.includes('relation') && error.message.includes('does not exist')) return [];
    throw new Error(`getApprovedClusters: ${error.message}`);
  }
  return (data || []) as KeywordClusterRow[];
}

/**
 * Update a cluster's status in keyword_clusters.
 */
async function updateClusterStatus(clusterId: string, status: string): Promise<void> {
  const db = getSupabase();
  const { error } = await db
    .from('keyword_clusters')
    .update({ status })
    .eq('id', clusterId);
  if (error) logger.warn(`Failed to update cluster ${clusterId} status: ${error.message}`);
}

/**
 * Build a UniversalPage from a keyword cluster.
 * Maps the cluster's dominant intent + site config to a proper page definition.
 */
function clusterToPage(cluster: KeywordClusterRow): UniversalPage | null {
  const site = sites[cluster.site_key];
  if (!site) {
    logger.warn(`Unknown site_key: ${cluster.site_key}`);
    return null;
  }

  const modeConfig = getSiteModeConfig(cluster.site_key);

  // Determine slug from cluster
  const slug = cluster.suggested_slug || cluster.main_keyword
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  // Determine intent from cluster dominant_intent
  const searchIntent = (cluster.dominant_intent || 'transactional') as SearchIntent;
  const intent = intentToPageIntent(searchIntent, cluster.main_keyword);

  // Find matching service from site config
  const mainKwLower = cluster.main_keyword.toLowerCase();
  const matchedService = site.services.find(s =>
    mainKwLower.includes(s.slug.replace(/-/g, ' ')) ||
    s.keywords.some(k => mainKwLower.includes(k.toLowerCase()))
  );

  // Build keywords list from cluster
  const clusterKeywords = (cluster.keywords_list || []).map(k => k.keyword);

  const page: UniversalPage = {
    siteKey: cluster.site_key,
    slug,
    pageType: 'topic_intent',
    intent,
    service: matchedService ? {
      name: matchedService.name,
      slug: matchedService.slug,
      keywords: [...matchedService.keywords, ...clusterKeywords],
      parentService: matchedService.category,
    } : {
      name: cluster.cluster_name,
      slug,
      keywords: clusterKeywords,
    },
    site,
    modeConfig,
  };

  return page;
}


// ─── Main Job ────────────────────────────────────────────────

export async function dailyGenerate(pagesPerRunOverride?: number, dryRun = false) {
  const PAGES_PER_RUN_LOCAL = pagesPerRunOverride ?? PAGES_PER_RUN;
  const startTime = Date.now();

  logger.info('=== Daily SEO Pipeline (Discover → Generate Approved) ===');
  logger.info(`Target: ${PAGES_PER_RUN_LOCAL} pages max`);
  if (dryRun) logger.info('MODE: DRY RUN — no writes');
  logger.info(`Excluded sites: ${EXCLUDED_SITES.join(', ')}`);

  // ─── Phase 1: Auto-Discovery ────────────────────────────────
  let discovery: DiscoveryResult = { servicesProcessed: 0, keywordsDiscovered: 0, dataforseoCalls: 0, details: [] };
  try {
    discovery = await autoDiscoverKeywords(dryRun);
  } catch (e) {
    logger.error(`Auto-discovery crashed: ${(e as Error).message}`);
  }

  // ─── Phase 2: Generate from Approved Clusters ─────────────────
  logger.info('\n=== Phase 2: Generate Approved Clusters ===');

  const approvedClusters = await getApprovedClusters(PAGES_PER_RUN_LOCAL);

  if (approvedClusters.length === 0) {
    logger.info('No approved clusters to generate. Approve clusters in the dashboard pipeline.');
    const totalDuration = Date.now() - startTime;
    await log('daily-generate', 'No approved clusters', 'info', undefined, {
      discovery: { services: discovery.servicesProcessed, keywords: discovery.keywordsDiscovered },
    }, totalDuration);

    return {
      discovery,
      generated: 0, errors: 0,
      duration: totalDuration,
    };
  }

  logger.info(`Found ${approvedClusters.length} approved clusters:`);
  for (const c of approvedClusters) {
    logger.info(`  • ${c.site_key}/${c.main_keyword} (vol: ${c.total_volume}, kw: ${c.keyword_count})`);
  }

  // Build UniversalPages from clusters
  const candidatePages: Array<{ page: UniversalPage; cluster: KeywordClusterRow }> = [];
  for (const cluster of approvedClusters) {
    if (EXCLUDED_SITES.includes(cluster.site_key)) continue;
    const page = clusterToPage(cluster);
    if (page) candidatePages.push({ page, cluster });
  }

  if (candidatePages.length === 0) {
    logger.warn('No valid pages could be built from approved clusters');
    return { discovery, generated: 0, errors: 0, duration: Date.now() - startTime };
  }

  // Anti-cannibalization check
  logger.info(`\nRunning anti-cannibalization check on ${candidatePages.length} pages...`);
  const { safe, blocked } = await filterCannibalized(candidatePages.map(c => c.page));

  if (blocked.length > 0) {
    logger.warn(`${blocked.length} pages blocked by cannibalization detector:`);
    for (const b of blocked) {
      logger.warn(`  ✗ ${b.page.slug} — ${b.risks[0]?.reason}`);
      // Mark cluster as 'conflict' so dashboard shows the issue
      const cluster = candidatePages.find(c => c.page.slug === b.page.slug)?.cluster;
      if (cluster?.id) await updateClusterStatus(cluster.id, 'conflict');
    }
  }

  const safeCandidates = candidatePages.filter(c => safe.includes(c.page));
  logger.info(`${safeCandidates.length} pages safe to generate`);

  if (dryRun) {
    logger.info('[DRY RUN] Would generate:');
    for (const { page, cluster } of safeCandidates) {
      logger.info(`  • ${page.slug} [${page.intent}] — cluster: ${cluster.main_keyword}`);
    }
    return { discovery, generated: 0, errors: 0, duration: Date.now() - startTime };
  }

  // Generate pages
  let generated = 0;
  let errors = 0;

  for (const { page, cluster } of safeCandidates) {
    try {
      logger.info(`\n  Generating: ${page.slug} [${page.intent}] (${cluster.main_keyword})...`);

      const seoPage = await generatePageContent(page);
      await upsertSeoPage(seoPage);

      // Update cluster status to 'generated'
      if (cluster.id) await updateClusterStatus(cluster.id, 'generated');

      generated++;
      logger.success(`  ✓ ${page.slug} — stored in seo_pages`);

      await log('daily-generate', `Generated ${page.slug}`, 'success', page.siteKey, {
        slug: page.slug,
        intent: page.intent,
        clusterId: cluster.id,
        clusterKeyword: cluster.main_keyword,
        volume: cluster.total_volume,
      });

      // Rate limit between generations
      if (generated < safeCandidates.length) {
        await new Promise(r => setTimeout(r, 1500));
      }

    } catch (e) {
      const errMsg = (e as Error).message;
      logger.error(`  ✗ ${page.slug}: ${errMsg}`);
      errors++;

      // Mark cluster as error, don't leave it stuck in 'approved'
      if (cluster.id) await updateClusterStatus(cluster.id, 'error');

      await log('daily-generate', `Error: ${page.slug}: ${errMsg}`, 'error', page.siteKey);
    }
  }

  // Final summary
  const totalDuration = Date.now() - startTime;

  logger.info('\n=== Summary ===');
  logger.info(`Discovery: ${discovery.servicesProcessed} services, ${discovery.keywordsDiscovered} keywords`);
  logger.info(`Generation: ${generated} generated, ${errors} errors, ${blocked.length} blocked (cannibalization)`);
  logger.info(`Duration: ${(totalDuration / 1000).toFixed(1)}s`);

  await log('daily-generate', 'Completed', 'info', undefined, {
    discovery: {
      services: discovery.servicesProcessed,
      keywords: discovery.keywordsDiscovered,
      calls: discovery.dataforseoCalls,
    },
    generation: { generated, errors, blocked: blocked.length },
    clusters: safeCandidates.map(c => ({
      id: c.cluster.id,
      keyword: c.cluster.main_keyword,
      slug: c.page.slug,
    })),
  }, totalDuration);

  return { discovery, generated, errors, blocked: blocked.length, duration: totalDuration };
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
