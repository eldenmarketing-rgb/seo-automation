/**
 * Dry run: show top 10 scored candidates for garage
 * using the new Supabase-only scoring logic.
 *
 * Usage: npx tsx scripts/dry-run-garage.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import { sites } from '../config/sites.js';
import { generateMatrix } from '../src/generators/universal-matrix.js';
import { getExistingSlugs, getPageKeywordScores, PageKeywordScore } from '../src/db/supabase.js';
import { getExistingSlugsFromFiles } from '../src/deployers/inject-pages.js';

function findKeywordMatch(slug: string, kwScores: Map<string, PageKeywordScore>): PageKeywordScore | undefined {
  if (kwScores.has(slug)) return kwScores.get(slug);
  const slugParts = slug.split('-');
  for (const [kwSlug, kwScore] of kwScores) {
    const kwBase = kwSlug.split('-').slice(0, -1).join('-');
    const pageBase = slugParts.slice(0, -1).join('-');
    if (kwBase && pageBase && kwBase === pageBase) return kwScore;
  }
  return undefined;
}

async function main() {
  const siteKey = 'garage';
  const site = sites[siteKey];

  console.log(`\n=== DRY RUN — ${site.name} (${siteKey}) ===\n`);

  // 1. Matrix
  const matrix = generateMatrix(siteKey);
  console.log(`Matrix total: ${matrix.length} pages possibles`);

  // 2. Existing slugs
  const supabaseSlugs = await getExistingSlugs(siteKey);
  const fileSlugs = getExistingSlugsFromFiles(siteKey);
  const existingSlugs = new Set([...supabaseSlugs, ...fileSlugs]);
  console.log(`Pages existantes: ${existingSlugs.size}`);

  // 3. Candidates
  const candidates = matrix.filter(p => !existingSlugs.has(p.slug));
  console.log(`Candidates (après exclusion): ${candidates.length}`);

  // 4. Keyword scores from Supabase
  const kwScoresRaw = await getPageKeywordScores(siteKey);
  const kwScores = new Map<string, PageKeywordScore>();
  for (const ks of kwScoresRaw) kwScores.set(ks.suggested_page, ks);
  console.log(`Patterns keywords Supabase: ${kwScores.size}`);

  // 5. Score
  interface Scored { slug: string; pageType: string; intent: string; city?: string; cityPop?: number; service?: string; score: number; totalVolume: number; avgKd: number; avgCpc: number; kwCount: number; topKw: string[] }
  const scored: Scored[] = [];

  for (const page of candidates) {
    const match = findKeywordMatch(page.slug, kwScores);
    if (!match) continue;

    const volumeScore = Math.round(match.total_volume / 1000);
    const kdPenalty = Math.round(match.avg_kd / 10);
    const score = Math.max(1, volumeScore - kdPenalty);

    scored.push({
      slug: page.slug,
      pageType: page.pageType,
      intent: page.intent,
      city: page.city?.name,
      cityPop: page.city?.population,
      service: page.service?.name,
      score,
      totalVolume: match.total_volume,
      avgKd: match.avg_kd,
      avgCpc: match.avg_cpc,
      kwCount: match.keyword_count,
      topKw: match.top_keywords.slice(0, 3).map(k => `${k.keyword} (${k.volume})`),
    });
  }

  // Sort: volume DESC, KD ASC, city population DESC (tiebreaker)
  scored.sort((a, b) => b.totalVolume - a.totalVolume || a.avgKd - b.avgKd || (b.cityPop || 0) - (a.cityPop || 0));

  // Display top 10
  console.log(`\nPages avec data keyword: ${scored.length}`);
  console.log(`\n${'#'.padEnd(3)} ${'Slug'.padEnd(45)} ${'Vol'.padStart(8)} ${'KD'.padStart(4)} ${'CPC'.padStart(6)} ${'KW'.padStart(4)} ${'Score'.padStart(6)}  Top Keywords`);
  console.log('-'.repeat(140));

  for (const [i, p] of scored.slice(0, 10).entries()) {
    console.log(
      `${(i + 1 + '.').padEnd(3)} ${p.slug.padEnd(45)} ${String(p.totalVolume).padStart(8)} ${String(p.avgKd).padStart(4)} ${(p.avgCpc + '€').padStart(6)} ${String(p.kwCount).padStart(4)} ${String(p.score).padStart(6)}  ${p.topKw.join(', ')}`
    );
  }

  // Also show top 10 unique services (best city per service)
  console.log(`\n\n=== TOP 10 SERVICES (meilleure ville par service) ===\n`);
  console.log(`${'#'.padEnd(3)} ${'Slug'.padEnd(45)} ${'Vol'.padStart(8)} ${'KD'.padStart(4)} ${'CPC'.padStart(6)} ${'KW'.padStart(4)} ${'Score'.padStart(6)}  Ville`);
  console.log('-'.repeat(120));

  const seenServices = new Set<string>();
  let rank = 0;
  for (const p of scored) {
    const svc = p.service || p.slug;
    if (seenServices.has(svc)) continue;
    seenServices.add(svc);
    rank++;
    console.log(
      `${(rank + '.').padEnd(3)} ${p.slug.padEnd(45)} ${String(p.totalVolume).padStart(8)} ${String(p.avgKd).padStart(4)} ${(p.avgCpc + '€').padStart(6)} ${String(p.kwCount).padStart(4)} ${String(p.score).padStart(6)}  ${p.city || '-'}`
    );
    if (rank >= 10) break;
  }

  console.log(`\n=== Résumé ===`);
  console.log(`Matrix: ${matrix.length} | Existantes: ${existingSlugs.size} | Candidates: ${candidates.length} | Avec data KW: ${scored.length} | Services uniques: ${seenServices.size}`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
