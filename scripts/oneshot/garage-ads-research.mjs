// Recherche mots-clés DataForSEO pour la campagne Google Ads garage Perpignan.
// Autonome : pointe .env en absolu, appelle l'API REST directement.
// Lancer : node garage-ads-research.mjs
import { config } from 'dotenv';
import { writeFileSync } from 'node:fs';

config({ path: '/home/ubuntu/sites/seo-automation/.env' });

const LOGIN = process.env.DATAFORSEO_LOGIN;
const PASSWORD = process.env.DATAFORSEO_PASSWORD;
if (!LOGIN || !PASSWORD) { console.error('Creds manquantes'); process.exit(1); }

const API = 'https://api.dataforseo.com/v3';
const AUTH = 'Basic ' + Buffer.from(`${LOGIN}:${PASSWORD}`).toString('base64');
const LOCATION = 2250; // France
const LANG = 'fr';

let totalCost = 0;

async function call(endpoint, body) {
  const res = await fetch(`${API}${endpoint}`, {
    method: 'POST',
    headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  if (data.status_code !== 20000) throw new Error(`API ${data.status_code}: ${data.status_message}`);
  totalCost += data.cost || 0;
  return data;
}

// ─── Clusters de seeds (géo-modifiés) ───────────────────────
const clusters = {
  'Généraliste':     ['garage perpignan', 'garagiste perpignan', 'reparation auto perpignan', 'mecanicien perpignan', 'garage pas cher perpignan'],
  'Reprogrammation': ['reprogrammation moteur perpignan', 'stage 1 perpignan', 'ethanol e85 perpignan', 'preparation moteur perpignan', 'boitier ethanol perpignan'],
  'Agglo':           ['garage canet', 'garage canet en roussillon', 'garage cabestany', 'garage saint esteve', 'garage rivesaltes'],
  'Entretien':       ['vidange perpignan', 'revision voiture perpignan', 'recharge clim voiture perpignan'],
  'Dépollution':     ['nettoyage fap perpignan', 'decalaminage perpignan', 'vanne egr perpignan'],
};

async function keywordIdeas(seeds, limit = 60) {
  const data = await call('/dataforseo_labs/google/keyword_ideas/live', [{
    keywords: seeds,
    location_code: LOCATION,
    language_code: LANG,
    include_serp_info: true,
    include_clickstream_data: false,
    limit,
    order_by: ['keyword_info.search_volume,desc'],
    filters: [['keyword_info.search_volume', '>', 0]],
  }]);
  const items = data.tasks?.[0]?.result?.[0]?.items || [];
  return items.map((it) => ({
    keyword: it.keyword,
    volume: it.keyword_info?.search_volume ?? 0,
    cpc: it.keyword_info?.cpc ?? null,
    compIndex: it.keyword_info?.competition_index ?? null,
    compLevel: it.keyword_info?.competition_level ?? it.keyword_info?.competition ?? null,
    kd: it.keyword_properties?.keyword_difficulty ?? it.serp_info?.keyword_difficulty ?? null,
    intent: it.search_intent_info?.main_intent ?? null,
  }));
}

async function searchVolume(keywords) {
  // batchs de 700 max ; ici on reste petit
  const data = await call('/keywords_data/google_ads/search_volume/live', [{
    keywords,
    location_code: LOCATION,
    language_code: LANG,
  }]);
  const items = data.tasks?.[0]?.result || [];
  const map = new Map();
  for (const it of items) {
    if (!it.keyword) continue;
    map.set(it.keyword.toLowerCase(), {
      keyword: it.keyword,
      volume: it.search_volume ?? 0,
      cpc: it.cpc ?? null,
      compIndex: it.competition_index ?? null,
      compLevel: it.competition ?? null,
    });
  }
  return map;
}

(async () => {
  const allIdeas = new Map(); // keyword -> {row, clusters:Set}
  for (const [name, seeds] of Object.entries(clusters)) {
    process.stderr.write(`\n[${name}] seeds: ${seeds.join(', ')}\n`);
    try {
      const ideas = await keywordIdeas(seeds);
      process.stderr.write(`  → ${ideas.length} idées\n`);
      for (const row of ideas) {
        const k = row.keyword.toLowerCase();
        if (!allIdeas.has(k)) allIdeas.set(k, { ...row, clusters: new Set() });
        allIdeas.get(k).clusters.add(name);
      }
    } catch (e) {
      process.stderr.write(`  ERREUR: ${e.message}\n`);
    }
  }

  // Volumes exacts (Google Ads) sur les seeds + top idées géo
  const seedList = [...new Set(Object.values(clusters).flat())];
  const geoIdeas = [...allIdeas.values()]
    .filter((r) => /perpignan|canet|cabestany|esteve|rivesaltes|roussillon|66000|pyrenees/i.test(r.keyword))
    .map((r) => r.keyword);
  const svTargets = [...new Set([...seedList, ...geoIdeas])].slice(0, 200);
  let sv = new Map();
  try {
    sv = await searchVolume(svTargets);
    process.stderr.write(`\n[SearchVolume] ${sv.size} mots-clés mesurés (Google Ads)\n`);
  } catch (e) {
    process.stderr.write(`\n[SearchVolume] ERREUR: ${e.message}\n`);
  }

  // Fusion : préférer le volume Google Ads quand dispo
  const rows = [];
  const seen = new Set();
  for (const [k, r] of allIdeas) {
    const g = sv.get(k);
    rows.push({
      keyword: r.keyword,
      clusters: [...r.clusters].join('|'),
      volume_labs: r.volume,
      volume_ads: g?.volume ?? '',
      cpc: g?.cpc ?? r.cpc ?? '',
      comp_index: g?.compIndex ?? r.compIndex ?? '',
      comp_level: g?.compLevel ?? r.compLevel ?? '',
      kd: r.kd ?? '',
      intent: r.intent ?? '',
    });
    seen.add(k);
  }
  // seeds non remontés par les idées mais mesurés en SV
  for (const [k, g] of sv) {
    if (seen.has(k)) continue;
    rows.push({
      keyword: g.keyword, clusters: 'seed', volume_labs: '', volume_ads: g.volume,
      cpc: g.cpc ?? '', comp_index: g.compIndex ?? '', comp_level: g.compLevel ?? '', kd: '', intent: '',
    });
  }

  rows.sort((a, b) => (Number(b.volume_ads || b.volume_labs || 0)) - (Number(a.volume_ads || a.volume_labs || 0)));

  // CSV
  const header = ['keyword', 'clusters', 'volume_ads', 'volume_labs', 'cpc', 'comp_index', 'comp_level', 'kd', 'intent'];
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header.join(',')]
    .concat(rows.map((r) => header.map((h) => esc(r[h])).join(',')))
    .join('\n');
  const out = '/home/ubuntu/sites/Site_Garage/docs/google-ads-keywords-dataforseo-2026-06.csv';
  writeFileSync(out, csv, 'utf8');

  // Résumé stdout (top 60 par volume)
  process.stderr.write(`\n========== TOP MOTS-CLÉS (tri volume) ==========\n`);
  process.stderr.write(`${'keyword'.padEnd(42)} vol_ads vol_labs  cpc   compIdx comp  intent\n`);
  for (const r of rows.slice(0, 60)) {
    process.stderr.write(
      `${String(r.keyword).slice(0, 42).padEnd(42)} ${String(r.volume_ads).padStart(6)} ${String(r.volume_labs).padStart(7)}  ${String(r.cpc).padStart(5)} ${String(r.comp_index).padStart(6)} ${String(r.comp_level).padEnd(7)} ${r.intent}\n`
    );
  }
  process.stderr.write(`\nTotal lignes: ${rows.length} | CSV: ${out}\n`);
  process.stderr.write(`COÛT TOTAL DataForSEO: $${totalCost.toFixed(4)}\n`);
})();
