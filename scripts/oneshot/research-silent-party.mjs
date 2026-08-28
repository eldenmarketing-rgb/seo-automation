#!/usr/bin/env node
/**
 * Recherche keywords complète pour site_key='silent-party'
 *
 * Étapes :
 * 1. Get search volume pour 35 seeds (1 call DFS)
 * 2. Get keyword ideas (expansion) pour les seeds avec volume > 0 (batches de 20)
 * 3. Sauve tout dans discovered_keywords (status='new', source='seed-research')
 * 4. Rapport : top keywords, répartition intent, coût total
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SITE_KEY = 'silent-party';
const DFS_LOGIN = process.env.DATAFORSEO_LOGIN;
const DFS_PASSWORD = process.env.DATAFORSEO_PASSWORD;
const DFS_BASE = 'https://api.dataforseo.com/v3';
const LOCATION_CODE_FR = 2250;
const LANGUAGE_CODE_FR = 'fr';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const auth = 'Basic ' + Buffer.from(`${DFS_LOGIN}:${DFS_PASSWORD}`).toString('base64');

// ─── Seeds (35) ─────────────────────────────────────────────
const SEEDS = [
  // Core produit
  'silent disco', 'silent party', 'silent club', 'soirée silencieuse',
  'casque silent disco', 'animation silent disco',
  'location silent disco', 'location casque silent disco',
  // Par verticale
  'silent disco camping', 'silent disco mariage', 'silent disco séminaire',
  'silent disco anniversaire', 'silent disco evjf', 'silent disco evg',
  'silent disco entreprise', 'silent disco festival',
  'team building silent disco', 'animation camping originale',
  // Intent transactionnel
  'prix silent disco', 'tarif silent disco', 'devis silent disco',
  'louer silent disco', 'silent disco france', 'silent disco professionnel',
  // Intent info
  'comment organiser silent disco', 'qu est ce qu une silent disco',
  'silent disco vs dj', 'réglementation bruit camping',
  'tapage nocturne camping', 'budget silent disco',
  // Adjacents
  'animation soirée originale', 'animation mariage originale',
  'team building original', 'boom silencieuse', 'soirée sans nuisance',
];

const INTENT_PATTERNS = [
  { pattern: /urgent|nuit|24h|dimanche|samedi|sos|ouvert/i, intent: 'transactional' },
  { pattern: /prix|tarif|co[uû]t|devis|combien|pas cher|louer|location/i, intent: 'commercial' },
  { pattern: /avis|meilleur|comparatif|vs\b|quel\b|recommand|top\b/i, intent: 'commercial' },
  { pattern: /comment|quand|pourquoi|est.?ce|diff[ée]rence|guide|tuto|c.?est quoi|faut.?il|r[ée]glementation/i, intent: 'informational' },
  { pattern: /pr[eè]s|proche|horaire|adresse|paris|lyon|marseille|bordeaux|toulouse|nantes|lille|strasbourg|montpellier/i, intent: 'local' },
];

function classifyIntent(keyword) {
  const kw = keyword.toLowerCase();
  for (const { pattern, intent } of INTENT_PATTERNS) if (pattern.test(kw)) return intent;
  return 'transactional';
}

function computeScore(kw) {
  let score = 0;
  const v = kw.searchVolume;
  if (v >= 1000) score += 40;
  else if (v >= 500) score += 35;
  else if (v >= 200) score += 30;
  else if (v >= 100) score += 25;
  else if (v >= 50) score += 20;
  else if (v >= 20) score += 15;
  else if (v >= 10) score += 10;
  else score += 5;

  if (kw.cpc >= 5) score += 25;
  else if (kw.cpc >= 3) score += 20;
  else if (kw.cpc >= 1.5) score += 15;
  else if (kw.cpc >= 0.5) score += 10;
  else if (kw.cpc > 0) score += 5;

  if (kw.competition === 'LOW') score += 20;
  else if (kw.competition === 'MEDIUM') score += 12;
  else if (kw.competition === 'HIGH') score += 5;

  const k = kw.keyword.toLowerCase();
  if (/prix|tarif|co[uû]t|devis|louer|location/.test(k)) score += 15;
  else if (/avis|meilleur|comparatif/.test(k)) score += 10;

  return Math.min(score, 100);
}

async function callDfs(endpoint, body) {
  const res = await fetch(`${DFS_BASE}${endpoint}`, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`DFS ${endpoint} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  if (data.status_code !== 20000) throw new Error(`DFS err: ${data.status_message}`);
  return data;
}

async function getSearchVolume(keywords) {
  const data = await callDfs('/keywords_data/google_ads/search_volume/live', [{
    keywords, location_code: LOCATION_CODE_FR, language_code: LANGUAGE_CODE_FR,
  }]);
  return { items: data.tasks?.[0]?.result || [], cost: data.cost || 0 };
}

async function getKeywordIdeas(seedBatch, limit = 100) {
  const data = await callDfs('/dataforseo_labs/google/keyword_ideas/live', [{
    keywords: seedBatch,
    location_code: LOCATION_CODE_FR,
    language_code: LANGUAGE_CODE_FR,
    include_serp_info: false,
    include_seed_keyword: false,
    limit,
    order_by: ['keyword_info.search_volume,desc'],
    filters: [['keyword_info.search_volume', '>', 0]],
  }]);
  return { items: data.tasks?.[0]?.result?.[0]?.items || [], cost: data.cost || 0 };
}

async function main() {
  console.log(`[research-silent-party] ${SEEDS.length} seeds, site_key=${SITE_KEY}\n`);
  let totalCost = 0;
  const allRows = new Map(); // keyword (lowercased) → row

  // ─── 1. Volume pour les seeds ────────────────────────────
  console.log('[1/3] Fetching search volumes for seeds...');
  const vol = await getSearchVolume(SEEDS);
  totalCost += vol.cost;
  console.log(`  → ${vol.items.length} volumes returned, cost $${vol.cost.toFixed(4)}`);

  let seedsWithVolume = [];
  for (const item of vol.items) {
    if (!item.keyword) continue;
    const kw = item.keyword.toLowerCase();
    const volume = item.search_volume || 0;
    if (volume > 0) seedsWithVolume.push(item.keyword);
    allRows.set(kw, {
      site_key: SITE_KEY,
      keyword: item.keyword,
      volume,
      cpc: item.cpc || 0,
      competition: item.competition || '',
      intent_type: item.search_intent_info?.main_intent?.toLowerCase() || classifyIntent(item.keyword),
      source: 'seed-research',
      status: 'new',
    });
  }
  console.log(`  → ${seedsWithVolume.length}/${SEEDS.length} seeds with volume > 0`);

  // ─── 2. Keyword Ideas (expansion) — batches de 20 ─────────
  console.log('\n[2/3] Fetching keyword ideas (expansion)...');
  const batches = [];
  for (let i = 0; i < SEEDS.length; i += 20) batches.push(SEEDS.slice(i, i + 20));

  for (let i = 0; i < batches.length; i++) {
    const b = batches[i];
    try {
      const r = await getKeywordIdeas(b, 150);
      totalCost += r.cost;
      console.log(`  → Batch ${i + 1}/${batches.length}: ${r.items.length} ideas, cost $${r.cost.toFixed(4)}`);
      for (const item of r.items) {
        if (!item.keyword) continue;
        const kw = item.keyword.toLowerCase();
        if (allRows.has(kw)) continue;
        const volume = item.keyword_info?.search_volume || 0;
        if (volume <= 0) continue;
        allRows.set(kw, {
          site_key: SITE_KEY,
          keyword: item.keyword,
          volume,
          cpc: item.keyword_info?.cpc || 0,
          competition: item.keyword_info?.competition || '',
          intent_type: item.keyword_info?.search_intent_info?.main_intent?.toLowerCase() || classifyIntent(item.keyword),
          source: 'seed-research',
          status: 'new',
        });
      }
    } catch (e) {
      console.error(`  ✗ Batch ${i + 1} failed: ${e.message}`);
    }
    if (i < batches.length - 1) await new Promise(r => setTimeout(r, 500));
  }

  // ─── 3. Filter: require silent-disco semantic match + reject noise ──
  console.log('\n[3/3] Filter, score, save to Supabase...');
  // Must contain one of these tokens (silent-disco semantic core)
  const REQUIRE = /\b(silent\s*(disco|party|club)|soir[eé]e\s*silenc|casque\s*(silent|sans.?fil)|disco\s*silenc|boom\s*silenc|f[eê]te\s*silenc|animation\s*silenc|party\s*silenc|silentdisco|silentparty)\b/i;
  // Hard rejects (even if they match REQUIRE by accident)
  const REJECT = /\b(sono|enceinte\s*bluetooth|karaok[eé]|dj\s*classique|location\s*sono|immobilier|spotify|deezer|apple\s*music|airpods|casque\s*gaming|casque\s*moto|casque\s*v[eé]lo|casque\s*chantier|casque\s*audio|casque\s*bluetooth|bose|sony|samsung)\b/i;

  const rows = [];
  let dropped = 0;
  for (const row of allRows.values()) {
    if (!REQUIRE.test(row.keyword)) { dropped++; continue; }
    if (REJECT.test(row.keyword)) { dropped++; continue; }
    row.competition = String(row.competition || '');
    row.score = computeScore({
      searchVolume: row.volume, cpc: row.cpc, competition: row.competition, keyword: row.keyword,
    });
    row.suggested_page = '';
    rows.push(row);
  }
  console.log(`  → Kept ${rows.length}, dropped ${dropped} (off-topic)`);

  // Upsert par batchs
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await supabase
      .from('discovered_keywords')
      .upsert(chunk, { onConflict: 'site_key,keyword' });
    if (error) { console.error('  ✗ upsert error:', error.message); break; }
    inserted += chunk.length;
  }

  console.log(`  → Upserted ${inserted} rows`);
  console.log(`\n💰 Coût total DataForSEO: $${totalCost.toFixed(4)}`);

  // ─── 4. Rapport ──────────────────────────────────────────
  console.log('\n═══════════════════ RAPPORT ═══════════════════\n');
  const sorted = rows.sort((a, b) => b.volume - a.volume);
  const totalVol = sorted.reduce((s, r) => s + r.volume, 0);
  console.log(`Total keywords : ${rows.length}`);
  console.log(`Volume mensuel total : ${totalVol.toLocaleString('fr-FR')} recherches\n`);

  const byIntent = {};
  for (const r of rows) {
    if (!byIntent[r.intent_type]) byIntent[r.intent_type] = { count: 0, vol: 0 };
    byIntent[r.intent_type].count++;
    byIntent[r.intent_type].vol += r.volume;
  }
  console.log('Répartition par intent :');
  for (const [intent, d] of Object.entries(byIntent).sort((a,b) => b[1].vol - a[1].vol)) {
    console.log(`  ${intent.padEnd(15)} ${String(d.count).padStart(4)} kw · ${String(d.vol).padStart(6)} vol/mois`);
  }

  console.log('\nTOP 40 keywords par volume :');
  for (const r of sorted.slice(0, 40)) {
    const cpcStr = r.cpc ? `${r.cpc.toFixed(2)}€` : '—';
    const comp = String(r.competition || '-').padEnd(8);
    console.log(`  ${String(r.volume).padStart(5)} vol  ${comp} ${cpcStr.padStart(7)}  ${r.keyword}`);
  }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
