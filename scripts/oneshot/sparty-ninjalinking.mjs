#!/usr/bin/env node
/**
 * S-Party Ninjalinking — Générateur de footprints Google
 *
 * Combine footprints (motifs techniques de sites où poster un lien)
 * avec termes de niche S-Party pour générer des recherches Google
 * ciblées qui révèlent des opportunités de backlinks gratuits.
 *
 * Usage :
 *   node scripts/sparty-ninjalinking.mjs            → génère HTML cliquable
 *   node scripts/sparty-ninjalinking.mjs --scrape   → scrape via DataForSEO (coût ~$0.30)
 *   node scripts/sparty-ninjalinking.mjs --niche=mariage  → cible une seule verticale
 *
 * Output :
 *   reports/sparty-ninjalinking.html   (à ouvrir dans Chrome — clics directs)
 *   reports/sparty-ninjalinking.md     (rapport markdown)
 *   reports/sparty-ninjalinking-serp.json (si --scrape)
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env') });

// ─── Niche S-Party ───────────────────────────────────────────

const NICHE_TERMS = {
  core: [
    'silent disco',
    'silent party',
    'casque silent disco',
    'animation silent disco',
  ],
  mariage: [
    'mariage',
    'animation mariage',
    'dj mariage',
    'prestataire mariage',
    'décoration mariage',
  ],
  entreprise: [
    'team building',
    'séminaire entreprise',
    'soirée entreprise',
    'animation séminaire',
    'événement entreprise',
  ],
  camping: [
    'camping',
    'animation camping',
    'village vacances',
    'club vacances',
  ],
  evenement: [
    'événementiel',
    'animation soirée',
    'organisation événement',
    'animation événementielle',
    'prestataire événementiel',
  ],
  festival: [
    'festival',
    'animation festival',
    'scène festival',
  ],
  evjf: [
    'EVJF',
    'enterrement vie de jeune fille',
    'idée EVJF',
    'EVG',
    'enterrement vie de garçon',
  ],
};

const ALL_TERMS = Object.values(NICHE_TERMS).flat();

// ─── Footprints catégorisés ──────────────────────────────────

const FOOTPRINTS = {
  // 1. ANNUAIRES — formulaires d'inscription libres
  annuaires: {
    label: '📇 Annuaires — soumission libre',
    description: 'Annuaires acceptant l\'inscription gratuite, lien dans la fiche',
    patterns: [
      'inurl:"add-listing" "{niche}" site:.fr',
      'inurl:"submit-site" "{niche}" site:.fr',
      'inurl:"soumettre-site" "{niche}"',
      'inurl:"ajouter-site" "{niche}"',
      'inurl:"inscription" "annuaire" "{niche}"',
      'inurl:"add-link" "{niche}" site:.fr',
      '"ajouter votre entreprise" "{niche}"',
      '"référencer mon site" "{niche}" site:.fr',
      '"annuaire prestataires" "{niche}"',
      '"liste prestataires" "{niche}" site:.fr',
    ],
  },

  // 2. FORUMS — profils utilisateur avec champ site web
  forums: {
    label: '💬 Forums — profil + signature',
    description: 'Forums dofollow ou semi avec champ site dans profil',
    patterns: [
      '"powered by phpbb" "{niche}" site:.fr',
      '"powered by vbulletin" "{niche}" site:.fr',
      '"powered by mybb" "{niche}" site:.fr',
      '"propulsé par phpbb" "{niche}"',
      'inurl:"forum" inurl:"register" "{niche}" site:.fr',
      'inurl:"forum/profile" "{niche}"',
      'inurl:"viewprofile" "{niche}" site:.fr',
      '"discussion forum" "{niche}" site:.fr',
      'inurl:"/membres/" "{niche}" site:.fr',
      'intitle:"forum" "{niche}" "inscription gratuite" site:.fr',
    ],
  },

  // 3. BLOG COMMENTS — articles avec commentaires ouverts dofollow
  blogComments: {
    label: '✍️ Blog comments — commentaires dofollow',
    description: 'Articles WordPress/Blogger avec commentaires acceptant un lien',
    patterns: [
      '"{niche}" "leave a comment" site:.fr',
      '"{niche}" "laisser un commentaire" site:.fr',
      '"{niche}" "votre commentaire" inurl:"blog" site:.fr',
      '"{niche}" "post a comment" "dofollow" site:.fr',
      'inurl:"wp-comments-post" "{niche}" site:.fr',
      '"{niche}" "commentluv" site:.fr',
      '"{niche}" "keywordluv" site:.fr',
      '"{niche}" "enableopinion" site:.fr',
    ],
  },

  // 4. GUEST POST — sites acceptant articles invités
  guestPost: {
    label: '📝 Guest post — articles invités',
    description: 'Sites annonçant accepter des contributions d\'auteurs externes',
    patterns: [
      '"{niche}" "guest post" site:.fr',
      '"{niche}" "article invité" site:.fr',
      '"{niche}" "contribuer" "article" site:.fr',
      '"{niche}" "écrivez pour nous" site:.fr',
      '"{niche}" "write for us" site:.fr',
      '"{niche}" "auteur invité" site:.fr',
      '"{niche}" "publier un article" site:.fr',
      '"{niche}" intitle:"contributors" site:.fr',
      '"{niche}" "soumettre un article" site:.fr',
      '"{niche}" "rédacteurs recherchés" site:.fr',
    ],
  },

  // 5. BROKEN LINK — pages avec liens cassés (technique broken link building)
  brokenLink: {
    label: '🔗 Broken link — opportunités liens cassés',
    description: 'Pages thématiques avec liens cassés à proposer de remplacer',
    patterns: [
      '"{niche}" intitle:"resources" site:.fr',
      '"{niche}" intitle:"liens utiles" site:.fr',
      '"{niche}" "ressources" "prestataires" site:.fr',
      '"{niche}" intitle:"links" site:.fr',
      '"{niche}" "nos partenaires" site:.fr',
      '"{niche}" intitle:"annuaire" inurl:"liens"',
    ],
  },

  // 6. WEB 2.0 — plateformes auto-hébergées
  web2: {
    label: '🌐 Web 2.0 — créer un compte/site',
    description: 'Plateformes où créer un mini-site/profil avec lien',
    patterns: [
      'inurl:".wordpress.com" "{niche}"',
      'inurl:".blogspot.com" "{niche}"',
      'inurl:".tumblr.com" "{niche}"',
      'inurl:".jimdofree.com" "{niche}"',
      'inurl:".weebly.com" "{niche}"',
      'inurl:".e-monsite.com" "{niche}"',
      'inurl:".over-blog.com" "{niche}"',
      'inurl:".canalblog.com" "{niche}"',
      'inurl:".skyrock.com" "{niche}"',
      'inurl:"medium.com" "{niche}"',
    ],
  },

  // 7. Q&A / Communautés
  qa: {
    label: '❓ Q&A — questions ouvertes',
    description: 'Plateformes Q&A avec questions thématiques sans réponse complète',
    patterns: [
      '"{niche}" site:quora.com',
      '"{niche}" site:reddit.com',
      '"{niche}" site:answers.com',
      '"{niche}" site:forum.doctissimo.fr',
      '"{niche}" "comment organiser" site:.fr',
      '"{niche}" "comment choisir" site:.fr',
      '"{niche}" "besoin de conseils" site:.fr',
      '"{niche}" "qui peut me recommander" site:.fr',
    ],
  },

  // 8. PROFIL DJ / Musique (haute valeur pour S-Party)
  djSites: {
    label: '🎧 Sites DJ/musique — profils thématiques',
    description: 'Sites musique où S-Party peut créer un profil DJ/artiste',
    patterns: [
      'site:mixcloud.com "silent disco"',
      'site:soundcloud.com "silent disco"',
      'site:last.fm "silent disco"',
      'site:bandcamp.com "silent disco"',
      'site:residentadvisor.net "silent"',
      '"djmag" "silent disco" site:.fr',
      'inurl:"profile" "dj" "{niche}" site:.fr',
    ],
  },

  // 9. ÉVÉNEMENTIEL & MARIAGE (niches S-Party)
  niche: {
    label: '💍 Sites événementiel/mariage spécifiques',
    description: 'Sites thématiques mariage/événement avec inscription prestataire',
    patterns: [
      '"prestataire mariage" "ajouter" site:.fr',
      '"annuaire mariage" "inscription" site:.fr',
      '"prestataire événementiel" "soumettre" site:.fr',
      '"trouver un dj" "ajouter" site:.fr',
      '"prestataire team building" "{niche}" site:.fr',
      '"animateur soirée" "inscription" site:.fr',
      '"camping" "nos animations" site:.fr',
    ],
  },

  // 10. PRESSE / COMMUNIQUÉS
  press: {
    label: '📰 Communiqués de presse FR',
    description: 'Sites publiant des CP gratuits avec lien dofollow',
    patterns: [
      'site:communiques-presse.com',
      'site:categorynet.com',
      'site:24presse.com',
      'site:e-comm.fr',
      '"publier un communiqué" "{niche}" site:.fr',
    ],
  },
};

// ─── Génération ──────────────────────────────────────────────

function generateSearches(filterNiche = null) {
  const terms = filterNiche
    ? (NICHE_TERMS[filterNiche] || [filterNiche])
    : ALL_TERMS;

  const results = {};

  for (const [key, cat] of Object.entries(FOOTPRINTS)) {
    results[key] = {
      label: cat.label,
      description: cat.description,
      searches: [],
    };

    for (const pattern of cat.patterns) {
      // Si le pattern utilise {niche}, le décliner sur tous les termes
      if (pattern.includes('{niche}')) {
        for (const term of terms) {
          const query = pattern.replace('{niche}', term);
          results[key].searches.push({
            pattern,
            term,
            query,
            url: `https://www.google.com/search?q=${encodeURIComponent(query)}&num=50`,
          });
        }
      } else {
        // Pattern sans {niche} — recherche unique
        results[key].searches.push({
          pattern,
          term: null,
          query: pattern,
          url: `https://www.google.com/search?q=${encodeURIComponent(pattern)}&num=50`,
        });
      }
    }
  }

  return results;
}

// ─── Output HTML cliquable ───────────────────────────────────

function renderHTML(searches) {
  const total = Object.values(searches).reduce((n, c) => n + c.searches.length, 0);

  let html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>S-Party Ninjalinking — ${total} footprints</title>
<style>
  body { font-family: -apple-system, sans-serif; max-width: 1100px; margin: 24px auto; padding: 0 16px; color: #1a1a1a; background: #fafafa; }
  h1 { color: #6d28d9; margin-bottom: 8px; }
  h2 { color: #4c1d95; margin-top: 32px; padding-top: 16px; border-top: 2px solid #e9d5ff; }
  .meta { color: #666; margin-bottom: 24px; }
  .cat-desc { color: #666; font-size: 14px; margin: -8px 0 16px; }
  .search { padding: 8px 12px; margin: 4px 0; background: #fff; border: 1px solid #e5e7eb; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; gap: 12px; font-size: 13px; }
  .search:hover { border-color: #a855f7; background: #faf5ff; }
  .query { font-family: ui-monospace, Menlo, monospace; color: #1a1a1a; flex: 1; word-break: break-word; }
  .term-badge { display: inline-block; padding: 2px 8px; background: #ede9fe; color: #6d28d9; border-radius: 4px; font-size: 11px; margin-right: 8px; }
  a.search-link { color: #fff; background: #6d28d9; padding: 6px 14px; border-radius: 4px; text-decoration: none; font-size: 12px; font-weight: 600; white-space: nowrap; }
  a.search-link:hover { background: #5b21b6; }
  .checked { opacity: 0.4; }
  details { margin: 16px 0; }
  summary { cursor: pointer; font-weight: 600; padding: 6px 0; }
  .toolbar { background: #f3e8ff; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
  .toolbar input { margin-right: 8px; padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 4px; width: 300px; }
  .toolbar button { padding: 6px 14px; background: #6d28d9; color: #fff; border: 0; border-radius: 4px; cursor: pointer; font-weight: 600; }
  .stats { display: flex; gap: 24px; margin-bottom: 24px; }
  .stat { background: #fff; padding: 12px 20px; border-radius: 8px; border: 1px solid #e5e7eb; }
  .stat-num { font-size: 28px; font-weight: 700; color: #6d28d9; }
  .stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
</style>
</head>
<body>
  <h1>🥷 S-Party Ninjalinking — Footprints Google</h1>
  <p class="meta">Génération : ${new Date().toISOString().slice(0, 10)} · Cible : <code>s-party.fr</code></p>

  <div class="stats">
    <div class="stat"><div class="stat-num">${total}</div><div class="stat-label">recherches</div></div>
    <div class="stat"><div class="stat-num">${Object.keys(searches).length}</div><div class="stat-label">catégories</div></div>
    <div class="stat"><div class="stat-num">${ALL_TERMS.length}</div><div class="stat-label">termes niche</div></div>
  </div>

  <div class="toolbar">
    <strong>Workflow conseillé :</strong> ouvre chaque recherche dans un nouvel onglet (clic milieu), repère les 2-3 meilleurs sites de la SERP, valide qu'ils ont un champ "site web" / commentaires ouverts / formulaire inscription, soumets ton lien. Clique sur la query pour la marquer comme traitée (rayée).
  </div>
`;

  for (const [key, cat] of Object.entries(searches)) {
    html += `\n  <h2>${cat.label} <span style="color:#999;font-size:14px">(${cat.searches.length})</span></h2>`;
    html += `\n  <p class="cat-desc">${cat.description}</p>\n`;

    // Grouper par pattern pour lisibilité
    const byPattern = {};
    for (const s of cat.searches) {
      if (!byPattern[s.pattern]) byPattern[s.pattern] = [];
      byPattern[s.pattern].push(s);
    }

    for (const [pat, items] of Object.entries(byPattern)) {
      html += `  <details>\n    <summary><code>${pat.replace(/</g, '&lt;')}</code> <span style="color:#999;font-weight:normal">(${items.length} variantes)</span></summary>\n`;
      for (const item of items) {
        const termTag = item.term ? `<span class="term-badge">${item.term}</span>` : '';
        html += `    <div class="search" onclick="this.classList.toggle('checked')"><div class="query">${termTag}${item.query.replace(/</g, '&lt;')}</div><a class="search-link" href="${item.url}" target="_blank" rel="noopener" onclick="event.stopPropagation()">🔍 Google</a></div>\n`;
      }
      html += `  </details>\n`;
    }
  }

  html += `\n  <hr style="margin:40px 0">
  <p style="color:#999;font-size:13px;text-align:center">Astuce : utilise l'extension Chrome "Linkclump" pour ouvrir 5-10 recherches d'un coup. Pour chaque SERP, vise les 5 premiers résultats : ils sont les + autoritaires de leur niche.</p>
</body></html>`;

  return html;
}

// ─── Output Markdown ─────────────────────────────────────────

function renderMarkdown(searches) {
  const total = Object.values(searches).reduce((n, c) => n + c.searches.length, 0);
  let md = `# S-Party Ninjalinking — ${total} footprints\n\n`;
  md += `Date : ${new Date().toISOString().slice(0, 10)}\n`;
  md += `Cible : \`s-party.fr\`\n\n`;
  md += `## Comment utiliser\n\n`;
  md += `1. Ouvre \`reports/sparty-ninjalinking.html\` dans Chrome pour cliquer directement\n`;
  md += `2. Pour chaque recherche, regarde les 5 premiers résultats Google\n`;
  md += `3. Sur chaque site, repère le mécanisme de lien (profil / commentaire / soumission / contact)\n`;
  md += `4. Soumets/poste ton lien avec une variation du texte préparé\n\n`;
  md += `## Catégories\n\n`;
  md += `| Catégorie | Recherches |\n|---|---:|\n`;
  for (const [key, cat] of Object.entries(searches)) {
    md += `| ${cat.label} | ${cat.searches.length} |\n`;
  }
  md += `\n---\n\n`;

  for (const [key, cat] of Object.entries(searches)) {
    md += `## ${cat.label}\n\n`;
    md += `*${cat.description}*\n\n`;
    for (const s of cat.searches) {
      const termPrefix = s.term ? `\`${s.term}\` — ` : '';
      md += `- ${termPrefix}[\`${s.query}\`](${s.url})\n`;
    }
    md += `\n`;
  }

  return md;
}

// ─── Scrape via DataForSEO SERP API (optionnel) ──────────────

async function scrapeViaSerp(searches, max = 20) {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) {
    console.error('❌ DATAFORSEO_LOGIN/PASSWORD manquants dans .env');
    process.exit(1);
  }

  const auth = Buffer.from(`${login}:${password}`).toString('base64');
  const allQueries = [];
  for (const cat of Object.values(searches)) {
    for (const s of cat.searches) allQueries.push(s.query);
  }

  // Limiter pour ne pas exploser le budget
  const queries = allQueries.slice(0, max);
  console.log(`🔍 Scraping ${queries.length} requêtes via DataForSEO SERP...`);

  const tasks = queries.map(q => ({
    language_code: 'fr',
    location_code: 2250,
    keyword: q,
    depth: 10,
  }));

  const res = await fetch('https://api.dataforseo.com/v3/serp/google/organic/live/advanced', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(tasks),
  });

  const json = await res.json();
  const cost = json.cost || 0;
  console.log(`💰 Coût DataForSEO : $${cost.toFixed(4)}`);

  const results = [];
  for (const task of json.tasks || []) {
    const items = task.result?.[0]?.items || [];
    const query = task.data?.keyword;
    const domains = items
      .filter(it => it.type === 'organic' && it.url)
      .map(it => ({ url: it.url, domain: it.domain, title: it.title }))
      .slice(0, 10);
    results.push({ query, domains });
  }

  return { results, cost };
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const scrape = args.includes('--scrape');
  const nicheArg = args.find(a => a.startsWith('--niche='));
  const filterNiche = nicheArg ? nicheArg.split('=')[1] : null;

  console.log('🥷 S-Party Ninjalinking — génération footprints');
  if (filterNiche) console.log(`   Filtre niche : ${filterNiche}`);

  const searches = generateSearches(filterNiche);
  const total = Object.values(searches).reduce((n, c) => n + c.searches.length, 0);

  const html = renderHTML(searches);
  const md = renderMarkdown(searches);

  const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../reports');
  const htmlPath = `${outDir}/sparty-ninjalinking.html`;
  const mdPath = `${outDir}/sparty-ninjalinking.md`;

  writeFileSync(htmlPath, html);
  writeFileSync(mdPath, md);

  console.log(`✅ ${total} footprints générés`);
  console.log(`   HTML : ${htmlPath}`);
  console.log(`   MD   : ${mdPath}`);

  if (scrape) {
    const { results, cost } = await scrapeViaSerp(searches, 30);
    const serpPath = `${outDir}/sparty-ninjalinking-serp.json`;
    writeFileSync(serpPath, JSON.stringify({ results, cost, generated: new Date().toISOString() }, null, 2));
    console.log(`   SERP : ${serpPath} (${results.length} requêtes)`);

    const top = {};
    for (const r of results) {
      for (const d of r.domains) {
        top[d.domain] = (top[d.domain] || 0) + 1;
      }
    }
    const ranked = Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 20);
    console.log('\n🎯 Top domaines récurrents dans les SERP :');
    for (const [domain, count] of ranked) {
      console.log(`   ${count}× ${domain}`);
    }
  }
}

main().catch(e => {
  console.error('❌', e);
  process.exit(1);
});
