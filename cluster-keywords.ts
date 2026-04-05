/**
 * Cluster discovered_keywords into semantic groups for all sites.
 * Groups keywords sharing 60%+ tokens, stores in keyword_clusters table.
 */

import dotenv from 'dotenv';
dotenv.config();

import { getSupabase } from './src/db/supabase.js';
import * as logger from './src/utils/logger.js';

// ─── Config ─────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'le', 'la', 'de', 'à', 'un', 'des', 'les', 'pour', 'par', 'dans',
  'sur', 'avec', 'en', 'du', 'au', 'une', 'et', 'ou', 'qui', 'que',
  'est', 'son', 'sa', 'ses', 'ce', 'cette', 'ces', 'a', 'l', 'd',
  'the', 'of', 'and', 'to', 'in', 'on', 'it', 'is',
]);

const SIMILARITY_THRESHOLD = 0.6;

const ALL_SITES = ['garage', 'carrosserie', 'vtc', 'massage', 'restaurant', 'retraite', 'reprog', 'voitures'];

// ─── Step 1: Create table ────────────────────────────────────

async function createClusterTable() {
  const projectRef = (process.env.SUPABASE_URL || '').replace('https://', '').split('.')[0];
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN || '';

  const sql = `
    CREATE TABLE IF NOT EXISTS keyword_clusters (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      site_key TEXT NOT NULL,
      cluster_name TEXT NOT NULL,
      main_keyword TEXT NOT NULL,
      total_volume INT NOT NULL DEFAULT 0,
      keyword_count INT NOT NULL DEFAULT 0,
      keywords_list JSONB NOT NULL DEFAULT '[]'::jsonb,
      suggested_slug TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(site_key, cluster_name)
    );

    CREATE INDEX IF NOT EXISTS idx_keyword_clusters_site ON keyword_clusters(site_key);
    CREATE INDEX IF NOT EXISTS idx_keyword_clusters_volume ON keyword_clusters(total_volume DESC);
  `;

  logger.info('Creating keyword_clusters table...');
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (res.ok) {
    logger.success('Table keyword_clusters ready');
  } else {
    const body = await res.text();
    throw new Error(`Migration failed ${res.status}: ${body.slice(0, 300)}`);
  }

  await new Promise(r => setTimeout(r, 1000));
}

// ─── Step 2: Tokenize and cluster ────────────────────────────

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
  for (const token of Array.from(setA)) {
    if (setB.has(token)) shared++;
  }
  const minLen = Math.min(setA.size, setB.size);
  return minLen > 0 ? shared / minLen : 0;
}

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
  // Sort by volume desc so highest-volume keyword seeds each cluster
  const sorted = [...rows].sort((a, b) => (b.volume || 0) - (a.volume || 0));
  const clusters: Cluster[] = [];
  const assigned = new Set<string>();

  for (const row of sorted) {
    if (assigned.has(row.keyword)) continue;
    const tokens = tokenize(row.keyword);
    if (tokens.length === 0) continue;

    // Try to find an existing cluster with 60%+ similarity
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
      // Add to existing cluster
      bestCluster.keywords.push({ keyword: row.keyword, volume: row.volume || 0, score: row.score });
      bestCluster.totalVolume += row.volume || 0;
      // Update main keyword if this one has higher volume
      if ((row.volume || 0) > bestCluster.mainVolume) {
        bestCluster.mainKeyword = row.keyword;
        bestCluster.mainVolume = row.volume || 0;
        bestCluster.name = tokens.join(' ');
      }
      // Merge tokens
      for (const t of tokens) {
        if (!bestCluster.tokens.includes(t)) bestCluster.tokens.push(t);
      }
    } else {
      // Create new cluster
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

  // Sort clusters by total volume
  return clusters.sort((a, b) => b.totalVolume - a.totalVolume);
}

// ─── Step 3: Store clusters ──────────────────────────────────

async function storeClusters(siteKey: string, clusters: Cluster[]) {
  const db = getSupabase();

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

  // Batch upsert
  const CHUNK = 200;
  let stored = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await db
      .from('keyword_clusters')
      .upsert(chunk, { onConflict: 'site_key,cluster_name' });
    if (error) {
      logger.error(`  Upsert failed: ${error.message}`);
    } else {
      stored += chunk.length;
    }
  }

  return stored;
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  logger.info('=== Keyword Clustering — All Sites ===\n');

  await createClusterTable();

  const grandSummary: Array<{ site: string; clusters: number; keywords: number; topVolume: number }> = [];

  for (const siteKey of ALL_SITES) {
    logger.info(`\n${'─'.repeat(60)}`);
    logger.info(`Processing: ${siteKey}`);

    const db = getSupabase();
    const { data, error } = await db
      .from('discovered_keywords')
      .select('keyword, score, volume, cpc, suggested_page, status')
      .eq('site_key', siteKey)
      .order('volume', { ascending: false });

    if (error) {
      logger.error(`  Failed to fetch keywords: ${error.message}`);
      continue;
    }

    if (!data || data.length === 0) {
      logger.info(`  No keywords found, skipping`);
      grandSummary.push({ site: siteKey, clusters: 0, keywords: 0, topVolume: 0 });
      continue;
    }

    logger.info(`  ${data.length} keywords loaded`);

    // Cluster
    const clusters = clusterKeywords(data as KwRow[]);
    logger.info(`  ${clusters.length} clusters formed`);

    // Store
    const stored = await storeClusters(siteKey, clusters);
    logger.success(`  ${stored} clusters stored`);

    // Show top 20
    console.log(`\n  TOP 20 CLUSTERS — ${siteKey}`);
    console.log(`  ${'#'.padStart(3)} | ${'Cluster'.padEnd(35)} | ${'Vol. cumulé'.padStart(10)} | ${'#KW'.padStart(5)} | Mot-clé principal`);
    console.log(`  ${'-'.repeat(95)}`);

    const top20 = clusters.slice(0, 20);
    for (let i = 0; i < top20.length; i++) {
      const c = top20[i];
      console.log(
        `  ${String(i + 1).padStart(3)} | ${c.name.slice(0, 35).padEnd(35)} | ${String(c.totalVolume).padStart(10)} | ${String(c.keywords.length).padStart(5)} | ${c.mainKeyword}`
      );
    }

    grandSummary.push({
      site: siteKey,
      clusters: clusters.length,
      keywords: data.length,
      topVolume: clusters[0]?.totalVolume || 0,
    });
  }

  // Grand summary
  console.log(`\n${'═'.repeat(90)}`);
  console.log('RÉSUMÉ GLOBAL');
  console.log('═'.repeat(90));
  console.log(`${'Site'.padEnd(15)} | ${'Keywords'.padStart(10)} | ${'Clusters'.padStart(10)} | ${'Top cluster vol.'.padStart(16)}`);
  console.log('-'.repeat(60));

  let totalKw = 0;
  let totalCl = 0;
  for (const s of grandSummary) {
    totalKw += s.keywords;
    totalCl += s.clusters;
    console.log(`${s.site.padEnd(15)} | ${String(s.keywords).padStart(10)} | ${String(s.clusters).padStart(10)} | ${String(s.topVolume).padStart(16)}`);
  }
  console.log('-'.repeat(60));
  console.log(`${'TOTAL'.padEnd(15)} | ${String(totalKw).padStart(10)} | ${String(totalCl).padStart(10)} |`);
  console.log('═'.repeat(90));
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
