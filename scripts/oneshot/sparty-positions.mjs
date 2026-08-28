/**
 * S-party — vérification des positions DataForSEO.
 *
 * 1. Ranked keywords de s-party.fr (vue d'ensemble — ce sur quoi Google nous voit)
 * 2. SERP live sur les keywords stratégiques (où on en est sur les vrais targets)
 */
import 'dotenv/config';

const login = process.env.DATAFORSEO_LOGIN;
const pwd = process.env.DATAFORSEO_PASSWORD;
const auth = 'Basic ' + Buffer.from(`${login}:${pwd}`).toString('base64');

const DOMAIN = 's-party.fr';
const LOC_FR = 2250;
const LANG_FR = 'fr';

// Keywords stratégiques (cf. project_silent_party_seo) — ce qui matter business
const TARGET_KW = [
  // core silent
  'silent disco', 'silent party', 'casque silent disco', 'location silent disco', 'silent disco france',
  // verticales prioritaires (pages existantes ou prévues)
  'animation camping', 'animation camping originale', 'soirée dansante camping',
  'team building original', 'team building musical', 'animation séminaire', 'soirée entreprise originale',
  'idée evg', 'idée evjf', 'activité evjf',
  'dj mariage', 'animation mariage originale',
  'animation anniversaire adulte',
  'animation festival',
];

async function post(path, body) {
  const r = await fetch('https://api.dataforseo.com/v3' + path, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}

async function rankedKeywords(domain, limit = 200) {
  const data = await post('/dataforseo_labs/google/ranked_keywords/live', [{
    target: domain,
    location_code: LOC_FR,
    language_code: LANG_FR,
    load_rank_absolute: true,
    limit,
    order_by: ['ranked_serp_element.serp_item.rank_absolute,asc'],
    filters: [['ranked_serp_element.serp_item.rank_absolute', '<=', 100]],
  }]);
  const items = data.tasks?.[0]?.result?.[0]?.items || [];
  const cost = data.cost || 0;
  return { items, cost };
}

async function liveSerp(keyword) {
  const data = await post('/serp/google/organic/live/regular', [{
    keyword,
    location_code: LOC_FR,
    language_code: LANG_FR,
    device: 'desktop',
    depth: 100,
  }]);
  const items = data.tasks?.[0]?.result?.[0]?.items || [];
  const cost = data.cost || 0;
  const ourHit = items.find(
    (x) => x.type === 'organic' && (x.domain || '').includes(DOMAIN.replace('s-party.fr', 's-party'))
  );
  const top3 = items.filter((x) => x.type === 'organic').slice(0, 3).map((x) => ({
    pos: x.rank_absolute,
    domain: x.domain,
  }));
  return { ourPos: ourHit?.rank_absolute || null, ourUrl: ourHit?.url || null, top3, cost };
}

(async () => {
  let totalCost = 0;

  console.log(`=== DataForSEO — Ranked Keywords pour ${DOMAIN} (France) ===\n`);
  const ranked = await rankedKeywords(DOMAIN);
  totalCost += ranked.cost;

  if (ranked.items.length === 0) {
    console.log('  Aucun keyword ranké détecté par DataForSEO (domaine trop neuf ou trop peu de signal).');
  } else {
    console.log(`  ${ranked.items.length} keywords rankés (top 100). Coût: $${ranked.cost.toFixed(4)}\n`);
    console.log('  Pos | Vol  | KD | Keyword                                     | URL');
    console.log('  ----|------|----|---------------------------------------------|-----');
    ranked.items.slice(0, 50).forEach((item) => {
      const pos = item.ranked_serp_element?.serp_item?.rank_absolute || 0;
      const vol = item.keyword_data?.keyword_info?.search_volume || 0;
      const kd = item.keyword_data?.keyword_info?.keyword_difficulty || 0;
      const kw = (item.keyword_data?.keyword || '').slice(0, 43).padEnd(43);
      const url = (item.ranked_serp_element?.serp_item?.relative_url || '').slice(0, 30);
      console.log(`  ${String(pos).padStart(3)} | ${String(vol).padStart(4)} | ${String(kd).padStart(2)} | ${kw} | ${url}`);
    });
  }

  console.log(`\n=== SERP live — keywords stratégiques (${TARGET_KW.length} kw) ===\n`);
  console.log('  Pos s-party | Top 3                                           | Keyword');
  console.log('  ------------|-------------------------------------------------|--------');
  for (const kw of TARGET_KW) {
    const r = await liveSerp(kw);
    totalCost += r.cost;
    const posStr = r.ourPos ? `pos ${r.ourPos}` : '— hors top 100';
    const top3Str = r.top3.map((t) => `${t.pos}.${t.domain.slice(0, 12)}`).join(' · ').padEnd(47);
    console.log(`  ${posStr.padEnd(11)} | ${top3Str} | ${kw}`);
    await new Promise((res) => setTimeout(res, 250));
  }

  console.log(`\n=== Coût total DataForSEO: $${totalCost.toFixed(4)} ===`);
})().catch((e) => {
  console.error('Erreur:', e);
  process.exit(1);
});
