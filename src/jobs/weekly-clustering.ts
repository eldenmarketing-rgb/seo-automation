/**
 * Weekly Clustering Job
 *
 * Recalculates keyword_clusters only for sites that have new
 * discovered_keywords since the last clustering run.
 *
 * Schedule: Sunday 22:00 (after auto-discovery has filled during the week)
 *
 * Keywords discovered between two clustering runs are still usable
 * by the scoring pipeline (via discovered_keywords direct fallback
 * in buildKeywordsContext) — they just won't be in a cluster yet.
 */

import dotenv from 'dotenv';
dotenv.config();

import { getSupabase, log } from '../db/supabase.js';
import { sites } from '../../config/sites.js';
import { notifyError } from '../notifications/telegram.js';
import * as logger from '../utils/logger.js';

// ─── Config ─────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'le', 'la', 'de', 'à', 'un', 'des', 'les', 'pour', 'par', 'dans',
  'sur', 'avec', 'en', 'du', 'au', 'une', 'et', 'ou', 'qui', 'que',
  'est', 'son', 'sa', 'ses', 'ce', 'cette', 'ces', 'a', 'l', 'd',
  'the', 'of', 'and', 'to', 'in', 'on', 'it', 'is',
]);

const SIMILARITY_THRESHOLD = 0.6;
const UPSERT_CHUNK = 200;

// ─── Tokenizer ──────────────────────────────────────────────

function tokenize(keyword: string): string[] {
  return keyword
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .split(/[\s\-_'']+/)
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));
}

function tokenSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let shared = 0;
  for (const token of setA) {
    if (setB.has(token)) shared++;
  }
  const minLen = Math.min(setA.size, setB.size);
  return minLen > 0 ? shared / minLen : 0;
}

// ─── Clustering Logic ───────────────────────────────────────

interface KwRow {
  keyword: string;
  score: number;
  volume: number;
  cpc: number | null;
  suggested_page: string | null;
  status: string;
}

interface Cluster {
  name: string;
  mainKeyword: string;
  mainVolume: number;
  totalVolume: number;
  keywords: Array<{ keyword: string; volume: number; score: number }>;
  tokens: string[];
  suggestedSlug: string | null;
}

function clusterKeywords(rows: KwRow[]): Cluster[] {
  const sorted = [...rows].sort((a, b) => (b.volume || 0) - (a.volume || 0));
  const clusters: Cluster[] = [];
  const assigned = new Set<string>();

  for (const row of sorted) {
    if (assigned.has(row.keyword)) continue;
    const tokens = tokenize(row.keyword);
    if (tokens.length === 0) continue;

    let bestCluster: Cluster | null = null;
    let bestSim = 0;

    for (const cluster of clusters) {
      const sim = tokenSimilarity(tokens, cluster.tokens);
      if (sim >= SIMILARITY_THRESHOLD && sim > bestSim) {
        bestSim = sim;
        bestCluster = cluster;
      }
    }

    if (bestCluster) {
      bestCluster.keywords.push({ keyword: row.keyword, volume: row.volume || 0, score: row.score });
      bestCluster.totalVolume += row.volume || 0;
      if ((row.volume || 0) > bestCluster.mainVolume) {
        bestCluster.mainKeyword = row.keyword;
        bestCluster.mainVolume = row.volume || 0;
        bestCluster.name = tokens.join(' ');
      }
      for (const t of tokens) {
        if (!bestCluster.tokens.includes(t)) bestCluster.tokens.push(t);
      }
    } else {
      clusters.push({
        name: tokens.join(' '),
        mainKeyword: row.keyword,
        mainVolume: row.volume || 0,
        totalVolume: row.volume || 0,
        keywords: [{ keyword: row.keyword, volume: row.volume || 0, score: row.score }],
        tokens,
        suggestedSlug: row.suggested_page,
      });
    }

    assigned.add(row.keyword);
  }

  return clusters.sort((a, b) => b.totalVolume - a.totalVolume);
}

// ─── Detect Sites Needing Reclustering ──────────────────────

interface SiteClusterStatus {
  siteKey: string;
  lastKeywordAt: string;
  lastClusterAt: string | null;
  needsUpdate: boolean;
}

async function getSitesNeedingUpdate(): Promise<SiteClusterStatus[]> {
  const db = getSupabase();
  const results: SiteClusterStatus[] = [];

  // Use site config as source of truth (avoids Supabase pagination limits)
  const siteKeys = Object.keys(sites);

  for (const siteKey of siteKeys) {
    // Latest keyword created_at for this site
    const { data: latestKw } = await db
      .from('discovered_keywords')
      .select('created_at')
      .eq('site_key', siteKey)
      .order('created_at', { ascending: false })
      .limit(1);

    // Latest cluster created_at for this site
    const { data: latestCluster } = await db
      .from('keyword_clusters')
      .select('created_at')
      .eq('site_key', siteKey)
      .order('created_at', { ascending: false })
      .limit(1);

    const lastKeywordAt = latestKw?.[0]?.created_at || '';
    const lastClusterAt = latestCluster?.[0]?.created_at || null;

    // Needs update if: no clusters yet, or new keywords since last clustering
    const needsUpdate = !lastClusterAt || lastKeywordAt > lastClusterAt;

    results.push({ siteKey, lastKeywordAt, lastClusterAt, needsUpdate });
  }

  return results;
}

// ─── Store Clusters ─────────────────────────────────────────

async function storeClusters(siteKey: string, clusters: Cluster[]): Promise<number> {
  const db = getSupabase();

  // Delete existing clusters for this site before reinserting
  // (full recalculation is cleaner than partial merge)
  await db.from('keyword_clusters').delete().eq('site_key', siteKey);

  const rows = clusters.map(c => ({
    site_key: siteKey,
    cluster_name: c.name,
    main_keyword: c.mainKeyword,
    total_volume: c.totalVolume,
    keyword_count: c.keywords.length,
    keywords_list: c.keywords,
    suggested_slug: c.suggestedSlug,
    status: 'new',
  }));

  let stored = 0;
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK);
    const { error } = await db
      .from('keyword_clusters')
      .insert(chunk);
    if (error) {
      logger.error(`  Upsert chunk failed: ${error.message}`);
    } else {
      stored += chunk.length;
    }
  }

  return stored;
}

// ─── Main Job ───────────────────────────────────────────────

export async function weeklyClustering(forceAll = false) {
  const startTime = Date.now();
  logger.info('=== Weekly Keyword Clustering ===\n');

  // 1. Detect which sites need reclustering
  const statuses = await getSitesNeedingUpdate();

  const sitesToProcess = forceAll
    ? statuses
    : statuses.filter(s => s.needsUpdate);

  logger.info(`Sites with keywords: ${statuses.length}`);
  logger.info(`Sites needing update: ${sitesToProcess.length}${forceAll ? ' (forced all)' : ''}`);

  for (const s of statuses) {
    const marker = s.needsUpdate ? '  -> NEEDS UPDATE' : '  (up to date)';
    logger.info(`  ${s.siteKey}: kw=${s.lastKeywordAt.slice(0, 19)} cluster=${s.lastClusterAt?.slice(0, 19) || 'none'}${marker}`);
  }

  if (sitesToProcess.length === 0) {
    logger.info('\nNo sites need reclustering. Done.');
    await log('weekly-clustering', 'No sites needed update', 'info');
    return { sitesProcessed: 0, totalClusters: 0, duration: Date.now() - startTime };
  }

  // 2. Process each site
  const db = getSupabase();
  let totalClusters = 0;
  const siteResults: Record<string, { keywords: number; clusters: number }> = {};

  for (const status of sitesToProcess) {
    const siteKey = status.siteKey;
    logger.info(`\n${'─'.repeat(50)}`);
    logger.info(`Clustering: ${siteKey}`);

    // Fetch all keywords for this site
    const { data, error } = await db
      .from('discovered_keywords')
      .select('keyword, score, volume, cpc, suggested_page, status')
      .eq('site_key', siteKey)
      .order('volume', { ascending: false });

    if (error) {
      logger.error(`  Failed to fetch keywords: ${error.message}`);
      siteResults[siteKey] = { keywords: 0, clusters: 0 };
      continue;
    }

    if (!data || data.length === 0) {
      logger.info(`  No keywords, skipping`);
      siteResults[siteKey] = { keywords: 0, clusters: 0 };
      continue;
    }

    logger.info(`  ${data.length} keywords loaded`);

    // Cluster
    const clusters = clusterKeywords(data as KwRow[]);
    logger.info(`  ${clusters.length} clusters formed`);

    // Store (delete + reinsert)
    const stored = await storeClusters(siteKey, clusters);
    logger.success(`  ${stored} clusters stored`);

    totalClusters += stored;
    siteResults[siteKey] = { keywords: data.length, clusters: stored };

    // Show top 10
    const top10 = clusters.slice(0, 10);
    for (let i = 0; i < top10.length; i++) {
      const c = top10[i];
      logger.info(`    ${i + 1}. ${c.name} — ${c.totalVolume} vol (${c.keywords.length} kw)`);
    }
  }

  // 3. Summary
  const duration = Date.now() - startTime;
  logger.info(`\n${'═'.repeat(50)}`);
  logger.info('SUMMARY');
  logger.info(`Sites processed: ${sitesToProcess.length}`);
  logger.info(`Total clusters: ${totalClusters}`);
  logger.info(`Duration: ${(duration / 1000).toFixed(1)}s`);

  for (const [site, r] of Object.entries(siteResults)) {
    logger.info(`  ${site}: ${r.keywords} kw -> ${r.clusters} clusters`);
  }

  await log('weekly-clustering', `${sitesToProcess.length} sites, ${totalClusters} clusters`, 'success', undefined, {
    sitesProcessed: sitesToProcess.length,
    totalClusters,
    sites: siteResults,
  }, duration);

  return { sitesProcessed: sitesToProcess.length, totalClusters, duration };
}

// ─── CLI Entry Point ────────────────────────────────────────

const isDirectRun = process.argv[1]?.includes('weekly-clustering');
if (isDirectRun) {
  const forceAll = process.argv.includes('--force');
  weeklyClustering(forceAll)
    .then(r => {
      logger.success(`Weekly clustering done: ${r.totalClusters} clusters across ${r.sitesProcessed} sites`);
      process.exit(0);
    })
    .catch(e => {
      logger.error(`Weekly clustering crashed: ${e.message}`);
      notifyError('weekly-clustering', e.message).finally(() => process.exit(1));
    });
}
