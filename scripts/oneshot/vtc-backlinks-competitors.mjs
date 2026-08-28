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

const competitors = [
  "accueilperpignantaxi.fr",
  "taxi-direct-perpignan.com",
];

const ourDomain = "ideal-transport.fr";

// Patterns pour catégoriser les RD
function categorize(domain) {
  const d = domain.toLowerCase();
  // Annuaires français généralistes
  if (/pagesjaunes|kompass|hoodspot|118000|justacote|petitpaume|annuaire-mairie|annuaireinverse|pagespro/.test(d)) return 'annuaire-fr-generaliste';
  // Annuaires VTC/Taxi spécialisés
  if (/taxi|vtc|chauffeur|transport|aeroport/.test(d)) return 'annuaire-vtc-niche';
  // Plateformes de réservation
  if (/blacklane|kiwitaxi|gettransfer|welcome-pickups|bookataxi|booking|tripadvisor|getyourguide|viator|expedia|airbnb/.test(d)) return 'plateforme-reservation';
  // Presse locale Pyrénées-Orientales
  if (/lindependant|made-in-perpignan|france3-regions|francebleu|midilibre|larepubliquedespyrenees|catalannews/.test(d)) return 'presse-locale';
  // Mairies / institutions
  if (/\.gouv\.fr|\.fr\/(commune|mairie)|perpignan\.fr|cd66|pyrenees-orientales|cci\.|chambre-metiers/.test(d)) return 'institution';
  // Hôtels / tourisme
  if (/hotel|tourisme|tourism|gite|chambre|riad|resort|spa/.test(d)) return 'hotel-tourisme';
  // Réseaux sociaux / GBP
  if (/facebook|instagram|linkedin|twitter|youtube|tiktok|pinterest|google\.com/.test(d)) return 'social';
  // Forum / Q&A
  if (/forum|reddit|quora|tripadvisor|avis-/.test(d)) return 'forum';
  // Blog / actu
  if (/blog|wordpress|wix|jimdo|medium/.test(d)) return 'blog';
  // PBN / Spam (patterns connus)
  if (/expireddomain|getwebsiteworth|dr\d+-links|pbn|directory\.shop|directory\.pro|wallpapers|kompromat|sergechel|wheretobuybest|musweb|globalecommerce|alljobs|tunca|ycm|booksreadr|read\.org|way2check|browse|backlinks|agmermer|mundotecnologia|happens-next/.test(d)) return 'spam-pbn';
  return 'autre';
}

// Domaines réplicables = annuaires, presse, plateformes, hôtels (pas spam, pas social)
function isReplicable(cat) {
  return ['annuaire-fr-generaliste', 'annuaire-vtc-niche', 'plateforme-reservation', 'presse-locale', 'institution', 'hotel-tourisme', 'blog'].includes(cat);
}

(async () => {
  console.log('# Audit Backlinks Concurrents — VTC Perpignan\n');
  console.log(`Date : ${new Date().toISOString().slice(0, 10)}\n`);
  console.log(`Notre domaine : ${ourDomain}\n`);

  const allCompetitorRds = new Map(); // domain -> { rank, sources[], category }

  // ─── Fetch concurrent RD ───
  for (const competitor of competitors) {
    console.log(`\n## ${competitor}\n`);
    const data = await post('/backlinks/referring_domains/live', [{
      target: competitor,
      limit: 250,
      order_by: ["rank,desc"],
      filters: [["backlinks", ">", 0]],
    }]);
    const rds = data.tasks?.[0]?.result?.[0]?.items || [];
    console.log(`Referring domains : ${rds.length}\n`);

    // Categorize
    const byCategory = {};
    for (const d of rds) {
      const cat = categorize(d.domain);
      byCategory[cat] = byCategory[cat] || [];
      byCategory[cat].push(d);

      const existing = allCompetitorRds.get(d.domain);
      if (existing) {
        existing.sources.push(competitor);
        existing.totalBacklinks += d.backlinks || 0;
      } else {
        allCompetitorRds.set(d.domain, {
          domain: d.domain,
          rank: d.rank || 0,
          backlinks: d.backlinks || 0,
          totalBacklinks: d.backlinks || 0,
          firstSeen: d.first_seen,
          sources: [competitor],
          category: cat,
        });
      }
    }

    // Print breakdown
    console.log('### Répartition par catégorie\n');
    const cats = Object.entries(byCategory).sort((a, b) => b[1].length - a[1].length);
    for (const [cat, list] of cats) {
      console.log(`- **${cat}** : ${list.length}`);
    }
  }

  // ─── Cross-reference + filter replicable ───
  console.log('\n\n## 🎯 Backlinks réplicables (présents chez les concurrents, exploitables)\n');

  const replicable = Array.from(allCompetitorRds.values())
    .filter(d => isReplicable(d.category))
    .sort((a, b) => {
      // Priorité : présent chez 2 concurrents, puis rank
      if (b.sources.length !== a.sources.length) return b.sources.length - a.sources.length;
      return b.rank - a.rank;
    });

  console.log(`Total : ${replicable.length} domaines\n`);

  // Group by category for the action plan
  const byCat = {};
  for (const d of replicable) {
    byCat[d.category] = byCat[d.category] || [];
    byCat[d.category].push(d);
  }

  const order = ['annuaire-fr-generaliste', 'annuaire-vtc-niche', 'plateforme-reservation', 'presse-locale', 'institution', 'hotel-tourisme', 'blog'];

  for (const cat of order) {
    if (!byCat[cat] || byCat[cat].length === 0) continue;
    console.log(`\n### ${cat.toUpperCase()} (${byCat[cat].length})\n`);
    console.log('| # | Domaine | Rank | Sources concurrents | Action |');
    console.log('|---|---------|------|---------------------|--------|');
    byCat[cat].slice(0, 50).forEach((d, i) => {
      const sources = d.sources.map(s => s.replace('.fr', '').replace('.com', '').slice(0, 6)).join(', ');
      console.log(`| ${i + 1} | ${d.domain} | ${d.rank} | ${sources} | À soumettre |`);
    });
  }

  // ─── Domaines toxiques (à éviter / à désavouer) ───
  console.log('\n\n## ⚠️ Domaines toxiques détectés (à ignorer / désavouer si liés)\n');
  const toxic = Array.from(allCompetitorRds.values())
    .filter(d => d.category === 'spam-pbn');
  console.log(`Total : ${toxic.length}\n`);
  toxic.slice(0, 20).forEach(d => console.log(`- ${d.domain}`));

  // ─── Summary stats ───
  console.log('\n\n## 📊 Synthèse\n');
  const allCats = {};
  for (const d of allCompetitorRds.values()) {
    allCats[d.category] = (allCats[d.category] || 0) + 1;
  }
  console.log('| Catégorie | Nb domaines |');
  console.log('|-----------|-------------|');
  Object.entries(allCats).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => {
    console.log(`| ${c} | ${n} |`);
  });

  // ─── Save raw data ───
  const out = {
    date: new Date().toISOString(),
    ourDomain,
    competitors,
    totalUniqueRds: allCompetitorRds.size,
    replicable,
    toxic,
    allDomains: Array.from(allCompetitorRds.values()),
  };
  writeFileSync('reports/vtc-competitors-backlinks.json', JSON.stringify(out, null, 2));
  console.log('\n📁 Données brutes : reports/vtc-competitors-backlinks.json');
})().catch(e => { console.error(e); process.exit(1); });
