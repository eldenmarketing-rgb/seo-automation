import 'dotenv/config';

const login = process.env.DATAFORSEO_LOGIN;
const pwd = process.env.DATAFORSEO_PASSWORD;
const auth = 'Basic ' + Buffer.from(`${login}:${pwd}`).toString('base64');

const KWS = [
  "taxi perpignan",
  "vtc perpignan",
  "chauffeur privé perpignan",
  "taxi aéroport perpignan",
  "taxi gare perpignan",
  "taxi canet en roussillon",
  "taxi argeles sur mer",
  "taxi collioure",
  "taxi aéroport girona",
  "taxi longue distance perpignan",
];

// Get SERP + volume + keyword difficulty
async function post(path, body) {
  const r = await fetch('https://api.dataforseo.com/v3' + path, {
    method: 'POST',
    headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}

async function getVolume(keywords) {
  const data = await post('/keywords_data/google_ads/search_volume/live', [{
    keywords,
    location_code: 2250, // France
    language_code: "fr",
  }]);
  return data.tasks?.[0]?.result || [];
}

async function getKd(keywords) {
  const data = await post('/dataforseo_labs/google/bulk_keyword_difficulty/live', [{
    keywords,
    location_code: 2250,
    language_code: "fr",
  }]);
  return data.tasks?.[0]?.result?.[0]?.items || [];
}

async function getSerp(keyword) {
  const data = await post('/serp/google/organic/live/regular', [{
    keyword,
    location_code: 2250,
    language_code: "fr",
    device: "desktop",
    depth: 20,
  }]);
  const items = data.tasks?.[0]?.result?.[0]?.items || [];
  return items.filter(x => x.type === 'organic').slice(0, 10).map(x => ({
    pos: x.rank_absolute,
    domain: x.domain,
    url: x.url,
    title: x.title?.slice(0, 70),
  }));
}

(async () => {
  console.log("=== VOLUMES + KD ===");
  const vols = await getVolume(KWS);
  const kds = await getKd(KWS);
  const kdMap = Object.fromEntries(kds.map(x => [x.keyword, x.keyword_difficulty]));
  const volMap = Object.fromEntries(vols.map(x => [x.keyword, { v: x.search_volume, cpc: x.cpc }]));

  for (const k of KWS) {
    const v = volMap[k] || {};
    const kd = kdMap[k] ?? '?';
    console.log(`  "${k}" → vol ${v.v ?? '?'} · KD ${kd} · CPC ${v.cpc ?? '?'}`);
  }

  console.log("\n=== SERP TOP 10 ===");
  for (const k of KWS.slice(0, 6)) {
    console.log(`\n--- "${k}" ---`);
    const serp = await getSerp(k);
    serp.forEach(r => console.log(`  ${String(r.pos).padStart(2)} ${r.domain.padEnd(35)} ${r.title}`));
    await new Promise(r => setTimeout(r, 500));
  }
})().catch(e => { console.error(e); process.exit(1); });
