#!/usr/bin/env node
/**
 * Passe 2 pour silent-party :
 * 1. Fetch KD réel (0-100) via Labs keyword_overview pour les top kw déjà en DB
 * 2. Fetch volumes pour les ADJACENTS (animation camping originale, team building, etc.)
 *    → c'est là qu'est le vrai intent d'achat, même si le produit final est un silent disco
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const DFS_LOGIN = process.env.DATAFORSEO_LOGIN;
const DFS_PASSWORD = process.env.DATAFORSEO_PASSWORD;
const DFS_BASE = 'https://api.dataforseo.com/v3';
const LOC = 2250, LANG = 'fr';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const auth = 'Basic ' + Buffer.from(`${DFS_LOGIN}:${DFS_PASSWORD}`).toString('base64');

// Adjacents : vrais mots-clés que les acheteurs tapent
const ADJACENTS = [
  // camping
  'animation camping originale', 'animation camping', 'animation nocturne camping',
  'animation soirée camping', 'soirée dansante camping', 'disco camping',
  'fête camping', 'animation camping 4 etoiles', 'animation camping 5 etoiles',
  // séminaire / team building
  'team building original', 'team building musical', 'team building insolite',
  'team building entreprise', 'animation séminaire', 'animation séminaire originale',
  'soirée entreprise originale', 'soirée entreprise insolite', 'animation ce',
  'animation comité entreprise', 'soirée fin d année entreprise',
  // mariage
  'animation mariage originale', 'animation mariage insolite', 'animation soirée mariage',
  'dj mariage', 'soirée mariage originale',
  // evjf / evg / anniversaire
  'animation evjf originale', 'idée evjf', 'idée evg', 'activité evjf',
  'animation anniversaire adulte', 'animation anniversaire 30 ans',
  'animation anniversaire 40 ans', 'animation anniversaire 50 ans',
  // festival / événement
  'animation festival', 'animation événement', 'animation soirée originale',
  'animation soirée atypique', 'animation insolite',
  // géo silent disco (intent local)
  'silent disco paris', 'silent disco lyon', 'silent disco marseille',
  'silent disco bordeaux', 'silent disco toulouse', 'silent disco nantes',
  'silent disco lille', 'silent disco strasbourg', 'silent disco montpellier',
  'silent disco nice', 'silent disco rennes', 'silent party paris',
  'silent party lyon', 'silent party marseille',
];

async function callDfs(endpoint, body) {
  const res = await fetch(`${DFS_BASE}${endpoint}`, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  if (data.status_code !== 20000) throw new Error(data.status_message);
  return data;
}

async function main() {
  let totalCost = 0;

  // ─── 1. Fetch KD réel via bulk_keyword_difficulty pour les top kw existants ──
  console.log('[1/3] Fetching real KD for existing top keywords...');
  const { data: existing } = await supabase
    .from('discovered_keywords')
    .select('id, keyword, volume')
    .eq('site_key', 'silent-party')
    .order('volume', { ascending: false })
    .limit(30);

  const existingKws = (existing || []).map(r => r.keyword);
  if (existingKws.length) {
    try {
      const r = await callDfs('/dataforseo_labs/google/bulk_keyword_difficulty/live', [{
        keywords: existingKws, location_code: LOC, language_code: LANG,
      }]);
      totalCost += r.cost || 0;
      const items = r.tasks?.[0]?.result?.[0]?.items || [];
      console.log(`  → ${items.length} KDs, cost $${(r.cost || 0).toFixed(4)}`);
      // Update kd column (colonne à vérifier)
      for (const item of items) {
        const kd = item.keyword_difficulty || 0;
        await supabase.from('discovered_keywords')
          .update({ kd: kd })
          .eq('site_key', 'silent-party')
          .eq('keyword', item.keyword);
      }
    } catch (e) {
      console.warn(`  ✗ KD fetch failed: ${e.message}`);
    }
  }

  // ─── 2. Fetch volumes pour les adjacents ─────────────────
  console.log('\n[2/3] Fetching volumes for adjacent/intent keywords...');
  const vol = await callDfs('/keywords_data/google_ads/search_volume/live', [{
    keywords: ADJACENTS, location_code: LOC, language_code: LANG,
  }]);
  totalCost += vol.cost || 0;
  const volItems = vol.tasks?.[0]?.result || [];
  console.log(`  → ${volItems.length} volumes, cost $${(vol.cost || 0).toFixed(4)}`);

  // ─── 3. Fetch KD pour les adjacents avec vol > 0 ─────────
  const withVol = volItems.filter(i => (i.search_volume || 0) > 0);
  console.log(`  → ${withVol.length}/${ADJACENTS.length} adjacents with vol > 0`);
  let kdMap = new Map();
  if (withVol.length) {
    try {
      const r = await callDfs('/dataforseo_labs/google/bulk_keyword_difficulty/live', [{
        keywords: withVol.map(i => i.keyword), location_code: LOC, language_code: LANG,
      }]);
      totalCost += r.cost || 0;
      const items = r.tasks?.[0]?.result?.[0]?.items || [];
      for (const item of items) kdMap.set(item.keyword.toLowerCase(), item.keyword_difficulty || 0);
    } catch (e) { console.warn(`  ✗ KD fetch failed: ${e.message}`); }
  }

  // Save adjacents with source='adjacent-intent' so they're clearly tagged
  const rows = [];
  for (const item of withVol) {
    const kw = item.keyword;
    const vol = item.search_volume || 0;
    const cpc = item.cpc || 0;
    const comp = item.competition || '';
    const intent = item.search_intent_info?.main_intent?.toLowerCase() || 'transactional';
    rows.push({
      site_key: 'silent-party',
      keyword: kw,
      volume: vol,
      cpc,
      competition: String(comp),
      intent_type: intent === 'navigational' ? 'local' : intent,
      source: 'adjacent-intent',
      status: 'new',
      score: Math.min(100, (vol >= 500 ? 35 : vol >= 100 ? 25 : vol >= 20 ? 15 : 5) + (cpc >= 1.5 ? 15 : cpc >= 0.5 ? 10 : 5) + (comp === 'LOW' ? 20 : comp === 'MEDIUM' ? 10 : 5)),
      suggested_page: '',
      kd: kdMap.get(kw.toLowerCase()) || 0,
    });
  }

  if (rows.length) {
    const { error } = await supabase.from('discovered_keywords')
      .upsert(rows, { onConflict: 'site_key,keyword' });
    if (error) console.error('upsert error:', error.message);
    else console.log(`  → Upserted ${rows.length} adjacent keywords`);
  }

  console.log(`\n💰 Coût passe 2: $${totalCost.toFixed(4)}`);

  // ─── Rapport final combiné ───────────────────────────────
  console.log('\n═══════════════════ RAPPORT COMPLET ═══════════════════\n');
  const { data: all } = await supabase
    .from('discovered_keywords')
    .select('keyword, volume, cpc, competition, intent_type, kd, source')
    .eq('site_key', 'silent-party')
    .gt('volume', 0)
    .order('volume', { ascending: false });

  const totalVol = all.reduce((s, r) => s + r.volume, 0);
  console.log(`Total keywords avec volume : ${all.length}`);
  console.log(`Volume mensuel total : ${totalVol.toLocaleString('fr-FR')} recherches\n`);

  console.log('─── SILENT DISCO CORE (produit) ───');
  const core = all.filter(r => r.source === 'seed-research');
  for (const r of core) printRow(r);

  console.log('\n─── ADJACENT INTENT (où se cache la demande) ───');
  const adj = all.filter(r => r.source === 'adjacent-intent');
  for (const r of adj.slice(0, 40)) printRow(r);
}

function printRow(r) {
  const cpc = r.cpc ? `${r.cpc.toFixed(2)}€` : '—';
  const kd = r.kd ? `KD ${String(r.kd).padStart(3)}` : 'KD   -';
  const comp = String(r.competition || '-').padEnd(6);
  const intent = String(r.intent_type || '-').padEnd(13);
  console.log(`  ${String(r.volume).padStart(5)} vol  ${kd}  ${comp} ${cpc.padStart(7)}  ${intent} ${r.keyword}`);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
