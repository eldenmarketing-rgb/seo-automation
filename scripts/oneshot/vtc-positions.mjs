import 'dotenv/config';
import { writeFileSync } from 'fs';

const login = process.env.DATAFORSEO_LOGIN;
const pwd = process.env.DATAFORSEO_PASSWORD;
const auth = 'Basic ' + Buffer.from(`${login}:${pwd}`).toString('base64');

async function post(path, body) {
  const r = await fetch('https://api.dataforseo.com/v3' + path, {
    method: 'POST',
    headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}

const target = "ideal-transport.fr";

(async () => {
  console.log(`# Positions Google — ${target}\n`);
  console.log(`Date : ${new Date().toISOString().slice(0, 10)}\n`);
  console.log('Source : DataForSEO Labs — Ranked Keywords (FR)\n');

  const data = await post('/dataforseo_labs/google/ranked_keywords/live', [{
    target,
    location_code: 2250,
    language_code: "fr",
    load_rank_absolute: true,
    limit: 700,
    filters: [["keyword_data.keyword_info.search_volume", ">", 0]],
    order_by: ["ranked_serp_element.serp_item.rank_absolute,asc"],
  }]);

  const items = data.tasks?.[0]?.result?.[0]?.items || [];
  if (items.length === 0) {
    console.log('❌ Aucune position détectée pour ce domaine.');
    console.log(`Status : ${data.tasks?.[0]?.status_message}`);
    return;
  }

  // Group by URL/page
  const byPage = new Map();
  for (const item of items) {
    const url = item.ranked_serp_element?.serp_item?.relative_url || '/';
    const kw = item.keyword_data?.keyword || '';
    const pos = item.ranked_serp_element?.serp_item?.rank_absolute || 0;
    const vol = item.keyword_data?.keyword_info?.search_volume || 0;
    const cpc = item.keyword_data?.keyword_info?.cpc || null;
    const kd = item.keyword_data?.keyword_info?.keyword_difficulty || 0;
    const etv = item.ranked_serp_element?.serp_item?.etv || 0; // estimated traffic volume

    if (!byPage.has(url)) byPage.set(url, []);
    byPage.get(url).push({ kw, pos, vol, cpc, kd, etv });
  }

  // Sort pages by total ETV desc
  const pages = Array.from(byPage.entries())
    .map(([url, kws]) => ({
      url,
      kws: kws.sort((a, b) => a.pos - b.pos),
      totalEtv: kws.reduce((s, k) => s + k.etv, 0),
      totalVol: kws.reduce((s, k) => s + k.vol, 0),
      bestPos: Math.min(...kws.map(k => k.pos)),
    }))
    .sort((a, b) => b.totalEtv - a.totalEtv);

  console.log(`## Synthèse globale\n`);
  console.log(`- Total mots-clés rankés : ${items.length}`);
  console.log(`- Pages avec au moins 1 ranking : ${pages.length}`);
  console.log(`- Trafic estimé total (ETV) : ${Math.round(pages.reduce((s, p) => s + p.totalEtv, 0))} clics/mois`);
  console.log(`- Volume cumulé adressable : ${pages.reduce((s, p) => s + p.totalVol, 0).toLocaleString('fr-FR')}/mois`);

  // Distribution des positions
  const allPos = items.map(i => i.ranked_serp_element?.serp_item?.rank_absolute || 0);
  const top3 = allPos.filter(p => p <= 3).length;
  const top10 = allPos.filter(p => p <= 10).length;
  const top20 = allPos.filter(p => p <= 20).length;
  const top50 = allPos.filter(p => p <= 50).length;
  const beyond = allPos.filter(p => p > 50).length;
  console.log(`\n### Distribution des positions\n`);
  console.log(`- Top 3   : ${top3}`);
  console.log(`- Top 10  : ${top10}`);
  console.log(`- Top 20  : ${top20}`);
  console.log(`- Top 50  : ${top50}`);
  console.log(`- > 50    : ${beyond}`);

  // ─── Détail par page ───
  console.log(`\n\n## Détail par page (triées par trafic estimé)\n`);
  for (const page of pages) {
    console.log(`\n### \`${page.url}\``);
    console.log(`- Mots-clés : ${page.kws.length}`);
    console.log(`- Trafic estimé : ${page.totalEtv.toFixed(1)} clics/mois`);
    console.log(`- Meilleure position : ${page.bestPos}`);
    console.log(`- Volume adressable : ${page.totalVol.toLocaleString('fr-FR')}/mois`);
    console.log('');
    console.log('| Position | Mot-clé | Volume | KD | CPC | ETV |');
    console.log('|---------:|---------|-------:|---:|----:|----:|');
    for (const k of page.kws.slice(0, 30)) {
      const cpc = k.cpc ? k.cpc.toFixed(2) + '€' : '-';
      const kd = k.kd || '-';
      console.log(`| ${k.pos} | ${k.kw} | ${k.vol.toLocaleString('fr-FR')} | ${kd} | ${cpc} | ${k.etv.toFixed(1)} |`);
    }
    if (page.kws.length > 30) {
      console.log(`| ... | _${page.kws.length - 30} autres mots-clés_ | | | | |`);
    }
  }

  // ─── Quick wins (positions 5-15) ───
  const quickWins = items
    .map(i => ({
      kw: i.keyword_data?.keyword || '',
      pos: i.ranked_serp_element?.serp_item?.rank_absolute || 0,
      vol: i.keyword_data?.keyword_info?.search_volume || 0,
      kd: i.keyword_data?.keyword_info?.keyword_difficulty || 0,
      url: i.ranked_serp_element?.serp_item?.relative_url || '/',
    }))
    .filter(k => k.pos >= 4 && k.pos <= 20 && k.vol >= 10)
    .sort((a, b) => b.vol - a.vol);

  if (quickWins.length > 0) {
    console.log(`\n\n## 🎯 Quick wins (positions 4-20, volume ≥ 10)\n`);
    console.log('| Position | Mot-clé | Volume | KD | URL |');
    console.log('|---------:|---------|-------:|---:|-----|');
    for (const k of quickWins.slice(0, 30)) {
      console.log(`| ${k.pos} | ${k.kw} | ${k.vol} | ${k.kd} | ${k.url} |`);
    }
  }

  // Save raw
  writeFileSync('reports/vtc-positions.json', JSON.stringify({ date: new Date().toISOString(), pages, totalItems: items.length, quickWins }, null, 2));
  console.log('\n\n📁 Données brutes : reports/vtc-positions.json');
})().catch(e => { console.error(e); process.exit(1); });
