// Mesure volume/CPC/concurrence EXACTS (Google Ads) d'une liste curatée
// de mots-clés géo-modifiés pour la campagne garage Perpignan.
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

const agglo = ['canet en roussillon', 'canet', 'cabestany', 'saint esteve', 'rivesaltes'];
const coreLocal = ['garage', 'garagiste', 'garage auto', 'garage automobile', 'mecanicien', 'reparation auto'];

const services = [
  'garage', 'garagiste', 'garage auto', 'garage automobile', 'garage voiture', 'mecanicien', 'mecanique auto',
  'reparation auto', 'reparation automobile', 'reparation voiture', 'garage pas cher', 'garage automobile pas cher',
  'entretien voiture', 'entretien automobile', 'revision voiture', 'vidange', 'vidange voiture',
  'courroie distribution', 'changement courroie distribution', 'embrayage', 'changement embrayage',
  'freins', 'changement freins', 'plaquettes frein', 'disque frein', 'amortisseurs', 'echappement',
  'climatisation voiture', 'recharge clim', 'clim voiture', 'recharge climatisation',
  'diagnostic auto', 'diagnostic automobile', 'diagnostic electronique',
  'batterie voiture', 'demarreur', 'alternateur',
  'nettoyage fap', 'fap', 'filtre a particules', 'decalaminage', 'decalaminage moteur', 'vanne egr', 'nettoyage vanne egr',
  'turbo', 'injecteurs', 'nettoyage injecteurs', 'boite de vitesse', 'boite vitesse',
  'depannage auto', 'depanneur auto', 'controle technique',
];
const reprog = ['reprogrammation moteur', 'reprogrammation', 'reprogrammation voiture', 'stage 1', 'ethanol e85', 'boitier ethanol', 'conversion ethanol', 'conversion e85', 'preparation moteur', 'cartographie moteur', 'kit ethanol e85'];

const kws = new Set();
for (const s of services) kws.add(`${s} perpignan`);
for (const c of coreLocal) for (const a of agglo) kws.add(`${c} ${a}`);
for (const r of reprog) { kws.add(`${r} perpignan`); kws.add(`${r} canet`); }
// quelques variantes de format géo
for (const c of coreLocal) { kws.add(`${c} perpignan 66`); kws.add(`${c} 66000`); }

const keywords = [...kws];

(async () => {
  process.stderr.write(`Mesure de ${keywords.length} mots-clés...\n`);
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
  writeFileSync('/home/ubuntu/sites/Site_Garage/docs/google-ads-keywords-dataforseo-2026-06.csv', csv, 'utf8');

  process.stderr.write(`\n${'keyword'.padEnd(40)} vol    cpc   comp   idx\n`);
  for (const r of rows) {
    if (r.volume <= 0) continue;
    process.stderr.write(`${r.keyword.slice(0, 40).padEnd(40)} ${String(r.volume).padStart(5)} ${String(r.cpc ?? '').padStart(5)} ${String(r.comp ?? '').padEnd(6)} ${r.compIndex ?? ''}\n`);
  }
  const zero = rows.filter((r) => r.volume <= 0).map((r) => r.keyword);
  process.stderr.write(`\n--- Volume 0 (${zero.length}) : ${zero.join(', ')}\n`);
  process.stderr.write(`\nTotal mesurés: ${rows.length} | Coût: $${cost.toFixed(4)}\n`);
})();
