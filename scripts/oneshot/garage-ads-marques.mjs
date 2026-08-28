// Mesure volume/CPC/concurrence EXACTS (Google Ads) des recherches
// "garage {marque} perpignan" + variantes, pour décider quelles pages marque construire.
import { config } from 'dotenv';
import { writeFileSync } from 'node:fs';
config({ path: '/home/ubuntu/sites/seo-automation/.env' });

const AUTH = 'Basic ' + Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString('base64');
const API = 'https://api.dataforseo.com/v3';
const LOCATION = 2250, LANG = 'fr';
let cost = 0;

async function call(endpoint, body) {
  const res = await fetch(`${API}${endpoint}`, { method: 'POST', headers: { Authorization: AUTH, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  if (data.status_code !== 20000) throw new Error(`${data.status_code}: ${data.status_message}`);
  cost += data.cost || 0;
  return data;
}

// Marques du marché français (orthographe usuelle tapée par les gens)
const brands = [
  'peugeot', 'renault', 'citroen', 'volkswagen', 'audi', 'bmw', 'mercedes', 'ford',
  'opel', 'dacia', 'toyota', 'fiat', 'nissan', 'seat', 'skoda', 'mini', 'ds',
  'volvo', 'hyundai', 'kia', 'alfa romeo', 'suzuki', 'mazda', 'land rover',
];
// gabarits de recherche géo-modifiés
const patterns = (b) => [
  `garage ${b} perpignan`,
  `garagiste ${b} perpignan`,
  `reparation ${b} perpignan`,
  `entretien ${b} perpignan`,
  `revision ${b} perpignan`,
  `garage ${b} canet`,
];

const kws = new Set();
for (const b of brands) for (const k of patterns(b)) kws.add(k);
const keywords = [...kws];

(async () => {
  process.stderr.write(`Mesure de ${keywords.length} mots-clés marques...\n`);
  const data = await call('/keywords_data/google_ads/search_volume/live', [{ keywords, location_code: LOCATION, language_code: LANG }]);
  const items = data.tasks?.[0]?.result || [];
  const rows = items.map((it) => ({
    keyword: it.keyword,
    volume: it.search_volume ?? 0,
    cpc: it.cpc ?? null,
    comp: it.competition ?? null,
    compIndex: it.competition_index ?? null,
  })).filter((r) => r.keyword);
  rows.sort((a, b) => b.volume - a.volume);

  const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const header = ['keyword', 'volume', 'cpc', 'competition', 'comp_index'];
  const csv = [header.join(',')].concat(rows.map((r) => [r.keyword, r.volume, r.cpc, r.comp, r.compIndex].map(esc).join(','))).join('\n');
  writeFileSync('/home/ubuntu/sites/Site_Garage/docs/google-ads-keywords-marques-2026-06.csv', csv, 'utf8');

  // agrégat par marque (somme des variantes)
  const byBrand = new Map();
  for (const b of brands) byBrand.set(b, 0);
  for (const r of rows) {
    for (const b of brands) { if (r.keyword.includes(` ${b} `) || r.keyword.includes(` ${b}`)) { byBrand.set(b, byBrand.get(b) + (r.volume || 0)); break; } }
  }
  const brandRank = [...byBrand.entries()].sort((a, b) => b[1] - a[1]);

  process.stderr.write(`\n=== DÉTAIL (volume > 0) ===\n${'keyword'.padEnd(34)} vol    cpc   comp\n`);
  for (const r of rows) {
    if (r.volume <= 0) continue;
    process.stderr.write(`${r.keyword.slice(0, 34).padEnd(34)} ${String(r.volume).padStart(5)} ${String(r.cpc ?? '').padStart(5)} ${r.comp ?? ''}\n`);
  }
  process.stderr.write(`\n=== CLASSEMENT PAR MARQUE (somme variantes) ===\n`);
  for (const [b, v] of brandRank) process.stderr.write(`${b.padEnd(14)} ${String(v).padStart(5)}\n`);
  process.stderr.write(`\nTotal mesurés: ${rows.length} | Coût: $${cost.toFixed(4)}\n`);
})();
