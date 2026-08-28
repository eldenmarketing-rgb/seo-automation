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

const targets = [
  "ideal-transport.fr",
  "accueilperpignantaxi.fr",
  "taxi-direct-perpignan.com",
];

function fmt(n) {
  return n == null ? 'n/a' : Number(n).toLocaleString('fr-FR');
}

(async () => {
  console.log('# Backlinks Audit — ideal-transport.fr + concurrents\n');
  console.log(`Date : ${new Date().toISOString().slice(0, 10)}\n`);

  // ─── Summaries (one per call — API limitation) ───
  console.log('## 1. Résumés comparatifs\n');
  const summaries = [];
  for (const target of targets) {
    const data = await post('/backlinks/summary/live', [{
      target,
      internal_list_limit: 1,
      backlinks_status_type: "live",
      include_subdomains: true,
    }]);
    const r = data.tasks?.[0]?.result?.[0];
    if (!r) {
      console.log(`### ${target}\n  ❌ ${data.tasks?.[0]?.status_message}\n`);
      continue;
    }
    summaries.push({ target, r });
    const dofollow = r.referring_domains - (r.referring_domains_nofollow || 0);
    console.log(`### ${target}`);
    console.log(`  - Referring domains : ${fmt(r.referring_domains)}`);
    console.log(`  - Backlinks total   : ${fmt(r.backlinks)}`);
    console.log(`  - Dofollow domains  : ${fmt(dofollow)} / ${fmt(r.referring_domains)}`);
    console.log(`  - Rank (DA-like)    : ${fmt(r.rank)}`);
    console.log(`  - First seen        : ${r.first_seen?.slice(0, 10) || 'n/a'}`);
    console.log(`  - Last seen         : ${r.last_visited?.slice(0, 10) || 'n/a'}`);
    console.log(`  - Anchors (uniques) : ${fmt(r.referring_links_anchors_count)}`);
    console.log(`  - Pages destination : ${fmt(r.referring_pages)}`);
    console.log(`  - .gov / .edu       : ${fmt(r.referring_domains_gov)} / ${fmt(r.referring_domains_edu)}`);
    console.log(`  - IPs uniques       : ${fmt(r.referring_ips)}`);
    console.log(`  - Sous-réseaux      : ${fmt(r.referring_subnets)}`);
    console.log('');
  }

  // ─── Detailed backlinks for ideal-transport.fr ───
  console.log('## 2. Backlinks détaillés — ideal-transport.fr\n');
  const blData = await post('/backlinks/backlinks/live', [{
    target: "ideal-transport.fr",
    mode: "as_is",
    backlinks_status_type: "live",
    include_subdomains: true,
    limit: 100,
    order_by: ["domain_from_rank,desc"],
  }]);
  const items = blData.tasks?.[0]?.result?.[0]?.items || [];
  console.log(`Total renvoyés : ${items.length}\n`);
  console.log('| # | Domaine source | Rank | Dofollow | Anchor | URL cible |');
  console.log('|---|----------------|------|----------|--------|-----------|');
  items.forEach((b, i) => {
    const dofollow = b.dofollow ? '✅' : '❌';
    const anchor = (b.anchor || '').slice(0, 40).replace(/\|/g, '\\|');
    const target = (b.url_to || '').replace('https://ideal-transport.fr', '').slice(0, 30);
    console.log(`| ${i + 1} | ${b.domain_from} | ${b.domain_from_rank || 0} | ${dofollow} | ${anchor} | ${target} |`);
  });

  // ─── Referring domains aggregated ───
  console.log('\n## 3. Referring domains agrégés — ideal-transport.fr\n');
  const rdData = await post('/backlinks/referring_domains/live', [{
    target: "ideal-transport.fr",
    limit: 100,
    order_by: ["rank,desc"],
  }]);
  const rds = rdData.tasks?.[0]?.result?.[0]?.items || [];
  console.log(`Total : ${rds.length}\n`);
  console.log('| # | Domaine | Rank | Backlinks | First seen |');
  console.log('|---|---------|------|-----------|------------|');
  rds.forEach((d, i) => {
    console.log(`| ${i + 1} | ${d.domain} | ${d.rank || 0} | ${d.backlinks || 0} | ${(d.first_seen || '').slice(0, 10)} |`);
  });

  // ─── Anchors ───
  console.log('\n## 4. Anchors les plus utilisés — ideal-transport.fr\n');
  const anchorData = await post('/backlinks/anchors/live', [{
    target: "ideal-transport.fr",
    limit: 30,
    order_by: ["backlinks,desc"],
  }]);
  const anchors = anchorData.tasks?.[0]?.result?.[0]?.items || [];
  console.log('| # | Anchor | Backlinks | Domains |');
  console.log('|---|--------|-----------|---------|');
  anchors.forEach((a, i) => {
    const txt = (a.anchor || '(empty)').slice(0, 50);
    console.log(`| ${i + 1} | ${txt} | ${a.backlinks || 0} | ${a.referring_domains || 0} |`);
  });

  // ─── Save full raw data ───
  const out = {
    date: new Date().toISOString(),
    summaries: summaries.map(s => ({ target: s.target, ...s.r })),
    backlinks_idealtransport: items,
    referring_domains_idealtransport: rds,
    anchors_idealtransport: anchors,
  };
  writeFileSync('reports/vtc-backlinks-audit.json', JSON.stringify(out, null, 2));
  console.log('\n📁 Données brutes sauvegardées : reports/vtc-backlinks-audit.json');
})().catch(e => console.error(e));
