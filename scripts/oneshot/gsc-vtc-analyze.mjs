import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import path from 'path';

const KEY = path.resolve('./config/gsc-service-account.json');
const auth = new GoogleAuth({ keyFile: KEY, scopes: ['https://www.googleapis.com/auth/webmasters.readonly'] });
const sc = google.searchconsole({ version: 'v1', auth });

const CANDIDATES = ['sc-domain:ideal-transport.fr', 'https://ideal-transport.fr/', 'https://ideal-transport.fr'];

function iso(d) { return d.toISOString().split('T')[0]; }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d; }

async function resolveSite() {
  for (const url of CANDIDATES) {
    try {
      await sc.searchanalytics.query({ siteUrl: url, requestBody: { startDate: iso(daysAgo(10)), endDate: iso(daysAgo(3)), dimensions: ['date'], rowLimit: 1 } });
      return url;
    } catch (e) { /* try next */ }
  }
  throw new Error('Aucune propriété accessible');
}

async function q(siteUrl, body) {
  const res = await sc.searchanalytics.query({ siteUrl, requestBody: body });
  return res.data.rows || [];
}

function totals(rows) {
  const c = rows.reduce((s, r) => s + (r.clicks || 0), 0);
  const i = rows.reduce((s, r) => s + (r.impressions || 0), 0);
  const posW = rows.reduce((s, r) => s + (r.position || 0) * (r.impressions || 0), 0);
  return { clicks: c, impressions: i, ctr: i ? c / i : 0, pos: i ? posW / i : 0 };
}

function pct(a, b) { if (!b) return a ? '+∞' : '0'; const p = ((a - b) / b) * 100; return (p >= 0 ? '+' : '') + p.toFixed(0) + '%'; }

(async () => {
  const site = await resolveSite();
  console.log(`\n### PROPRIÉTÉ: ${site}\n`);

  // Périodes : 28j récents vs 28j précédents (données J-3)
  const end = daysAgo(3), endPrev = daysAgo(31);
  const start = daysAgo(30), startPrev = daysAgo(58);

  const cur = await q(site, { startDate: iso(start), endDate: iso(end), dimensions: ['date'], rowLimit: 1000 });
  const prev = await q(site, { startDate: iso(startPrev), endDate: iso(endPrev), dimensions: ['date'], rowLimit: 1000 });
  const tc = totals(cur), tp = totals(prev);

  console.log('## TOTAUX (28 jours, données à J-3)');
  console.log(`Clics:        ${tc.clicks}  (${pct(tc.clicks, tp.clicks)} vs 28j préc.)`);
  console.log(`Impressions:  ${tc.impressions}  (${pct(tc.impressions, tp.impressions)})`);
  console.log(`CTR:          ${(tc.ctr * 100).toFixed(2)}%  (préc. ${(tp.ctr * 100).toFixed(2)}%)`);
  console.log(`Pos. moyenne: ${tc.pos.toFixed(1)}  (préc. ${tp.pos.toFixed(1)})`);

  // Trend par semaine
  console.log('\n## TENDANCE HEBDO (clics / impressions)');
  const byWeek = {};
  for (const r of cur) {
    const d = new Date(r.keys[0]); const wk = Math.floor((end - d) / (7 * 864e5));
    byWeek[wk] = byWeek[wk] || { c: 0, i: 0 };
    byWeek[wk].c += r.clicks; byWeek[wk].i += r.impressions;
  }
  Object.keys(byWeek).sort((a, b) => b - a).forEach(w => {
    console.log(`  S-${w}: ${byWeek[w].c} clics / ${byWeek[w].i} impr.`);
  });

  // Top queries
  const qs = await q(site, { startDate: iso(start), endDate: iso(end), dimensions: ['query'], rowLimit: 200 });
  console.log('\n## TOP 20 REQUÊTES (par impressions)');
  qs.slice(0, 20).forEach(r => {
    console.log(`  ${String(r.impressions).padStart(5)} impr | ${String(r.clicks).padStart(3)} clics | CTR ${(r.ctr*100).toFixed(1).padStart(4)}% | pos ${r.position.toFixed(1).padStart(4)} | ${r.keys[0]}`);
  });

  // Opportunités : impressions élevées, position 4-20, CTR faible
  console.log('\n## OPPORTUNITÉS (pos 4–20, ≥20 impr, triées par impressions)');
  qs.filter(r => r.position >= 4 && r.position <= 20 && r.impressions >= 20)
    .sort((a, b) => b.impressions - a.impressions).slice(0, 25)
    .forEach(r => console.log(`  ${String(r.impressions).padStart(5)} impr | ${String(r.clicks).padStart(3)} clics | pos ${r.position.toFixed(1).padStart(4)} | ${r.keys[0]}`));

  // Quasi-top : pos 2-8 avec impressions -> pousser en top 3
  console.log('\n## À POUSSER EN TOP 3 (pos 2–8, ≥15 impr)');
  qs.filter(r => r.position > 2 && r.position <= 8 && r.impressions >= 15)
    .sort((a, b) => a.position - b.position).slice(0, 20)
    .forEach(r => console.log(`  pos ${r.position.toFixed(1).padStart(4)} | ${String(r.impressions).padStart(5)} impr | ${String(r.clicks).padStart(3)} clics | ${r.keys[0]}`));

  // Top pages
  const pgs = await q(site, { startDate: iso(start), endDate: iso(end), dimensions: ['page'], rowLimit: 200 });
  console.log('\n## TOP 20 PAGES (par impressions)');
  pgs.slice(0, 20).forEach(r => {
    console.log(`  ${String(r.impressions).padStart(5)} impr | ${String(r.clicks).padStart(3)} clics | CTR ${(r.ctr*100).toFixed(1).padStart(4)}% | pos ${r.position.toFixed(1).padStart(4)} | ${r.keys[0].replace('https://ideal-transport.fr','')}`);
  });

  console.log(`\n## COUVERTURE`);
  console.log(`Requêtes distinctes (28j): ${qs.length}${qs.length>=200?'+ (plafonné)':''}`);
  console.log(`Pages avec impressions:   ${pgs.length}${pgs.length>=200?'+ (plafonné)':''}`);
  console.log(`Pages en top 3:  ${pgs.filter(r=>r.position<=3).length}`);
  console.log(`Pages en top 10: ${pgs.filter(r=>r.position<=10).length}`);

  // Devices
  const dev = await q(site, { startDate: iso(start), endDate: iso(end), dimensions: ['device'], rowLimit: 10 });
  console.log('\n## APPAREILS');
  dev.forEach(r => console.log(`  ${r.keys[0].padEnd(8)} ${r.clicks} clics / ${r.impressions} impr / pos ${r.position.toFixed(1)}`));
})().catch(e => { console.error('ERREUR:', e.message); process.exit(1); });
