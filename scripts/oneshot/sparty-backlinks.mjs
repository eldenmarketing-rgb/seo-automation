/**
 * S-party — recherche de backlinks réplicables via DataForSEO Backlinks.
 *
 * Méthode :
 * 1. Pull referring_domains de concurrents (silentdisco.fr, funbooke.com, etc.)
 * 2. Catégorise (annuaire, mariage, événementiel, presse, plateforme...)
 * 3. Cross-référence : domaines présents chez ≥2 concurrents = signal fort
 * 4. Filtre les patterns spam/PBN connus
 * 5. Sortie JSON + markdown actionnable
 */
import 'dotenv/config';
import { writeFileSync } from 'fs';

const login = process.env.DATAFORSEO_LOGIN;
const pwd = process.env.DATAFORSEO_PASSWORD;
const auth = 'Basic ' + Buffer.from(`${login}:${pwd}`).toString('base64');

async function post(path, body) {
  const r = await fetch('https://api.dataforseo.com/v3' + path, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}

const ourDomain = 's-party.fr';

// Concurrents : un mix par verticale ciblée
const competitors = [
  // core silent disco
  'silentdisco.fr',
  'silentdiscobox.com',
  // animation événementielle / team building
  'funbooke.com',
  // mariage / DJ
  'mariages.net',
  // animation camping
  'volt-events.com',
];

function categorize(domain) {
  const d = domain.toLowerCase();

  // Annuaires généralistes français
  if (/pagesjaunes|kompass|hoodspot|118000|justacote|petitpaume|annuaire-mairie|pagespro|societe\.com|verif\.com|infogreffe|infonet/.test(d))
    return 'annuaire-fr-generaliste';

  // Annuaires événementiel / mariage / animation
  if (/mariage|wedding|evjf|evg|seminaire|teambuilding|team-building|evenement|anniversaire|festif|animation|prestataire/.test(d))
    return 'annuaire-evenementiel';

  // Plateformes booking / loueur événementiel
  if (/funbooke|bookevent|weezevent|eventbrite|placeminute|billetweb|drinkeez|jaimemafete|deezevent/.test(d))
    return 'plateforme-event';

  // Camping / tourisme
  if (/camping|tohapi|homair|huttopia|sandaya|yelloh|capfun|sunelia|tourisme|tourism|gite|resort/.test(d))
    return 'camping-tourisme';

  // Presse locale + média
  if (/lemonde|lefigaro|france3-regions|francebleu|ouest-france|sudouest|lindependant|midilibre|20minutes|leparisien|cosmopolitan|elle\.fr|grazia|marieclaire|aufeminin|terrafemina|madmoizelle/.test(d))
    return 'presse-media';

  // Institutions / mairies / CCI / .gouv
  if (/\.gouv\.fr|\.fr\/(commune|mairie)|cci\.|chambre-metiers|cd66|prefecture/.test(d)) return 'institution';

  // Hôtels / lieux de réception
  if (/hotel|domaine-de|chateau|salle-de-mariage|salle-reception|lieuxinedit/.test(d)) return 'hotel-lieu-reception';

  // Réseaux sociaux / Google
  if (/facebook|instagram|linkedin|twitter|youtube|tiktok|pinterest|google\.com|youtu\.be/.test(d)) return 'social';

  // Forums / Q&A / avis
  if (/forum|reddit|quora|tripadvisor|trustpilot|avis-|yelp|opinion/.test(d)) return 'forum-avis';

  // Blogs lifestyle / wedding / parents / bien-être
  if (/blog|wordpress\.com|wix\.com|jimdo|medium|over-blog|skyrock|substack|canalblog/.test(d)) return 'blog';

  // PBN / spam patterns
  if (/expireddomain|getwebsiteworth|dr\d+-links|pbn|directory\.shop|directory\.pro|wallpapers|kompromat|wheretobuybest|musweb|globalecommerce|alljobs|booksreadr|read\.org|way2check|backlinks-?|seo-?tools|seoreviewtools|websiteseochecker|websitevaluecheck|hypestat|trustscam|w3snoop|sitelike|siteworthtraffic|seokicks|spyserp|seo-?info/.test(d))
    return 'spam-pbn';

  return 'autre';
}

const REPLICABLE = new Set([
  'annuaire-fr-generaliste',
  'annuaire-evenementiel',
  'plateforme-event',
  'camping-tourisme',
  'presse-media',
  'institution',
  'hotel-lieu-reception',
  'blog',
]);

(async () => {
  console.log(`# Backlinks réplicables pour ${ourDomain}\n`);
  console.log(`Date : ${new Date().toISOString().slice(0, 10)}\n`);
  console.log(`Concurrents analysés : ${competitors.join(', ')}\n`);

  const all = new Map();
  let totalCost = 0;

  // 0. Backlinks actuels du site (pour exclure ce qu'on a déjà)
  console.log('\n## Backlinks actuels de s-party.fr\n');
  const ours = await post('/backlinks/referring_domains/live', [{
    target: ourDomain,
    limit: 1000,
    filters: [['backlinks', '>', 0]],
  }]);
  totalCost += ours.cost || 0;
  const ourRds = new Set((ours.tasks?.[0]?.result?.[0]?.items || []).map((d) => d.domain));
  console.log(`  ${ourRds.size} referring domains déjà actifs.\n`);
  if (ourRds.size > 0 && ourRds.size <= 30) {
    [...ourRds].forEach((d) => console.log(`  - ${d}`));
  }

  // 1. Pull chaque concurrent
  for (const competitor of competitors) {
    console.log(`\n## ${competitor}`);
    const data = await post('/backlinks/referring_domains/live', [{
      target: competitor,
      limit: 300,
      order_by: ['rank,desc'],
      filters: [['backlinks', '>', 0]],
    }]);
    totalCost += data.cost || 0;
    const rds = data.tasks?.[0]?.result?.[0]?.items || [];
    console.log(`  ${rds.length} referring domains`);

    for (const d of rds) {
      const cat = categorize(d.domain);
      const existing = all.get(d.domain);
      if (existing) {
        if (!existing.sources.includes(competitor)) existing.sources.push(competitor);
        existing.totalBacklinks += d.backlinks || 0;
      } else {
        all.set(d.domain, {
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
  }

  // 2. Filtrer : réplicable + pas déjà chez nous + au moins 1 source
  const replicable = [...all.values()]
    .filter((d) => REPLICABLE.has(d.category))
    .filter((d) => !ourRds.has(d.domain))
    .sort((a, b) => {
      if (b.sources.length !== a.sources.length) return b.sources.length - a.sources.length;
      return b.rank - a.rank;
    });

  console.log(`\n\n## 🎯 ${replicable.length} domaines réplicables (non déjà chez nous)\n`);

  // Group par catégorie
  const byCat = {};
  for (const d of replicable) {
    (byCat[d.category] = byCat[d.category] || []).push(d);
  }

  const order = [
    'annuaire-evenementiel',
    'plateforme-event',
    'annuaire-fr-generaliste',
    'camping-tourisme',
    'hotel-lieu-reception',
    'presse-media',
    'institution',
    'blog',
  ];

  for (const cat of order) {
    if (!byCat[cat] || byCat[cat].length === 0) continue;
    console.log(`\n### ${cat.toUpperCase()} (${byCat[cat].length})\n`);
    console.log('| # | Domaine | Rank | BL | Sources | Action |');
    console.log('|---|---------|------|----|---------|--------|');
    byCat[cat].slice(0, 40).forEach((d, i) => {
      const src = d.sources.map((s) => s.split('.')[0].slice(0, 8)).join('+');
      console.log(`| ${i + 1} | ${d.domain} | ${d.rank} | ${d.backlinks} | ${src} | soumettre |`);
    });
  }

  // 3. Toxiques
  const toxic = [...all.values()].filter((d) => d.category === 'spam-pbn');
  console.log(`\n\n## ⚠️ ${toxic.length} domaines toxiques (à éviter)\n`);
  toxic.slice(0, 15).forEach((d) => console.log(`  - ${d.domain}`));

  // 4. Synthèse globale
  console.log('\n\n## 📊 Synthèse\n');
  const counts = {};
  for (const d of all.values()) counts[d.category] = (counts[d.category] || 0) + 1;
  console.log('| Catégorie | # |');
  console.log('|-----------|---|');
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([c, n]) => console.log(`| ${c} | ${n} |`));

  console.log(`\n💰 Coût DataForSEO : $${totalCost.toFixed(4)}`);

  // 5. Sauvegarde
  const out = {
    date: new Date().toISOString(),
    ourDomain,
    competitors,
    ourCurrentReferringDomains: [...ourRds],
    totalUniqueRds: all.size,
    replicable,
    toxic,
    allDomains: [...all.values()],
    cost: totalCost,
  };
  writeFileSync('reports/sparty-backlinks.json', JSON.stringify(out, null, 2));
  console.log('📁 Données brutes : reports/sparty-backlinks.json');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
