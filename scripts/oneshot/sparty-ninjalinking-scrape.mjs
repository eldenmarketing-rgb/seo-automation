#!/usr/bin/env node
/**
 * S-Party Ninjalinking — Scrape SERP ciblé (patterns à haut signal)
 *
 * Scrape via DataForSEO SERP les ~150 requêtes les plus susceptibles
 * de retourner des sites réels où poster un backlink.
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env') });

// ─── Requêtes à fort signal ──────────────────────────────────

const HIGH_SIGNAL_QUERIES = {
  'Annuaires prestataires événementiel': [
    'silent disco annuaire prestataires',
    'animation mariage annuaire France',
    'dj mariage annuaire prestataires',
    'animation séminaire annuaire',
    'team building prestataires France annuaire',
    'animation événementielle annuaire France',
    'prestataire mariage inscription gratuite',
    'animation camping annuaire prestataires',
    'annuaire mariage inscription prestataire',
    'annuaire animation soirée France',
    'annuaire prestataire événementiel France gratuit',
    'liste prestataires mariage France',
    'annuaire dj mariage France',
    'plateforme prestataire mariage France inscription',
  ],

  'Guest post / Article invité': [
    'mariage écrivez pour nous blog',
    'événementiel écrivez pour nous',
    'animation soirée article invité',
    'mariage guest post France',
    'mariage soumettre un article',
    'team building écrivez pour nous',
    'blog mariage article invité accepté',
    'blog événementiel auteur invité',
    'blog camping article invité',
    'silent disco article invité blog',
    'animation événementielle contributeur blog',
  ],

  'Forums actifs FR': [
    'silent disco forum discussion France',
    'silent party forum France',
    'forum mariage France inscription',
    'forum organisation mariage discussion',
    'forum entreprise team building',
    'forum événementiel France discussion',
    'forum dj mariage France',
    'forum camping animation France',
    'forum animation soirée discussion',
    'forum prestataires événementiel',
  ],

  'Q&A — questions ouvertes': [
    'silent disco quora',
    'silent disco reddit',
    'animation mariage quora',
    'team building original quora',
    'idée EVJF quora',
    'animation camping quora',
    'soirée entreprise originale quora',
    'comment organiser silent disco',
    'silent disco fr.quora.com',
  ],

  'Sites musique / DJ': [
    'mixcloud silent disco france',
    'soundcloud silent disco france',
    'bandcamp silent disco',
    'last.fm silent disco',
    'residentadvisor silent disco france',
    'silent disco profile DJ France',
  ],

  'Pages ressources / partenaires': [
    'silent disco nos partenaires',
    'animation mariage liens utiles',
    'événementiel ressources prestataires',
    'mariage prestataires recommandés',
    'camping nos animations partenaires',
    'entreprise partenaires événementiel',
    'domaine mariage prestataires recommandés',
    'château mariage partenaires animation',
    'hôtel mariage prestataires recommandés',
  ],

  'Blog comments ouverts': [
    'silent disco laisser un commentaire',
    'animation mariage votre commentaire blog',
    'silent party commentaire blog',
    'blog mariage commentaires ouverts',
    'blog événementiel commentaires',
    'team building laisser un commentaire blog',
    'animation soirée blog commentaire',
  ],

  'Web 2.0 dans la niche': [
    'silent disco wordpress.com',
    'silent disco blogspot.com',
    'silent disco medium.com',
    'animation mariage wordpress.com',
    'silent disco e-monsite.com',
    'silent disco over-blog.com',
    'silent disco canalblog.com',
    'silent disco tumblr.com',
  ],

  'Bookmarking / Curation': [
    'silent disco pearltrees',
    'silent disco scoop.it',
    'silent disco pinterest france',
    'animation mariage scoop.it',
    'silent disco issuu',
  ],

  'Sites mariage/camping prestataires': [
    'annuaire mariage prestataire ajout gratuit France',
    'liste prestataires mariage France inscription',
    'annuaire camping animation référencement',
    'plateforme mariage inscription prestataire',
    'annuaire dj inscription gratuite',
    'site prestataire événementiel inscription gratuite',
    'inscrire entreprise animation mariage',
  ],

  'Communautés mariage/event FR': [
    'silent disco mariages.net',
    'silent disco forum mariage France',
    'communauté organisateurs mariage France',
    'discussion silent disco mariage',
    'silent disco zankyou',
  ],
};

// ─── Scrape ──────────────────────────────────────────────────

async function main() {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) {
    console.error('❌ DATAFORSEO_LOGIN/PASSWORD manquants');
    process.exit(1);
  }
  const auth = Buffer.from(`${login}:${password}`).toString('base64');

  const allQueries = [];
  for (const [cat, qs] of Object.entries(HIGH_SIGNAL_QUERIES)) {
    for (const q of qs) allQueries.push({ category: cat, query: q });
  }
  console.log(`🥷 Scraping ${allQueries.length} requêtes ciblées via DataForSEO SERP...`);

  // DataForSEO live/advanced : une tâche par requête. Parallélisme contrôlé (5 simultanées).
  const allResults = [];
  let totalCost = 0;
  const CONCURRENCY = 5;

  async function fetchOne({ category, query }) {
    const res = await fetch('https://api.dataforseo.com/v3/serp/google/organic/live/advanced', {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([{ language_code: 'fr', location_code: 2250, keyword: query, depth: 20 }]),
    });
    const json = await res.json();
    totalCost += json.cost || 0;
    const items = json.tasks?.[0]?.result?.[0]?.items || [];
    const domains = items
      .filter(it => it.type === 'organic' && it.url)
      .map(it => ({ url: it.url, domain: it.domain, title: it.title, desc: it.description }))
      .slice(0, 10);
    return { category, query, domains };
  }

  for (let i = 0; i < allQueries.length; i += CONCURRENCY) {
    const batch = allQueries.slice(i, i + CONCURRENCY);
    console.log(`  Batch ${Math.floor(i / CONCURRENCY) + 1}/${Math.ceil(allQueries.length / CONCURRENCY)} (${batch.length} queries)...`);
    const results = await Promise.all(batch.map(fetchOne));
    allResults.push(...results);
  }

  console.log(`💰 Coût total : $${totalCost.toFixed(4)}`);

  // ─── Analyse : domaines récurrents + scoring ──────────────
  const domainStats = {};
  const TOXIC_PATTERNS = ['linguee', '.gov.', '.gouv.', '.edu', 'univ-', 'github', 'gitlab', 'wikipedia', 'youtube.com/watch', 'translate.google', '.pdf'];
  const NICHE_BONUS = ['mariage', 'wedding', 'event', 'mariage', 'animation', 'dj', 'soiree', 'silent', 'camping', 'team-building', 'seminaire', 'evenement'];

  for (const r of allResults) {
    for (const d of r.domains) {
      const isToxic = TOXIC_PATTERNS.some(p => d.domain.includes(p) || d.url.includes(p));
      if (isToxic) continue;
      if (!domainStats[d.domain]) {
        domainStats[d.domain] = { domain: d.domain, hits: 0, queries: [], titles: [], score: 0 };
      }
      domainStats[d.domain].hits++;
      domainStats[d.domain].queries.push(r.query);
      if (d.title) domainStats[d.domain].titles.push(d.title);
    }
  }

  // Scoring : hits + bonus si nom de domaine contient termes de niche
  for (const d of Object.values(domainStats)) {
    let score = d.hits * 10;
    for (const term of NICHE_BONUS) {
      if (d.domain.includes(term)) score += 15;
    }
    d.score = score;
  }

  const ranked = Object.values(domainStats).sort((a, b) => b.score - a.score);

  // ─── Output ──────────────────────────────────────────────
  const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../reports');
  const jsonPath = `${outDir}/sparty-ninjalinking-opportunities.json`;
  const mdPath = `${outDir}/sparty-ninjalinking-opportunities.md`;

  writeFileSync(jsonPath, JSON.stringify({ results: allResults, ranked, cost: totalCost }, null, 2));

  let md = `# S-Party Ninjalinking — Opportunités détectées\n\n`;
  md += `Date : ${new Date().toISOString().slice(0, 10)}\n`;
  md += `Requêtes scrapées : ${allResults.length} · Domaines uniques (filtrés) : ${ranked.length}\n`;
  md += `Coût : $${totalCost.toFixed(4)}\n\n`;

  md += `## 🎯 Top 30 domaines — opportunités prioritaires\n\n`;
  md += `Domaines qui reviennent le plus dans les SERP de la niche. Plus le score est haut, plus le domaine est récurrent et thématique.\n\n`;
  md += `| Rang | Domaine | Score | Hits | Exemple title |\n|---:|---|---:|---:|---|\n`;
  for (const [i, d] of ranked.slice(0, 30).entries()) {
    const title = d.titles[0]?.slice(0, 60).replace(/\|/g, '\\|') || '';
    md += `| ${i + 1} | [${d.domain}](https://${d.domain}) | ${d.score} | ${d.hits} | ${title} |\n`;
  }

  md += `\n## 📂 Résultats par catégorie\n\n`;
  const byCat = {};
  for (const r of allResults) {
    if (!byCat[r.category]) byCat[r.category] = [];
    byCat[r.category].push(r);
  }
  for (const [cat, results] of Object.entries(byCat)) {
    md += `### ${cat}\n\n`;
    for (const r of results) {
      if (r.domains.length === 0) continue;
      md += `**\`${r.query}\`**\n\n`;
      for (const d of r.domains.slice(0, 5)) {
        const isToxic = TOXIC_PATTERNS.some(p => d.domain.includes(p));
        if (isToxic) continue;
        md += `- [${d.domain}](${d.url}) — ${d.title?.slice(0, 100) || ''}\n`;
      }
      md += `\n`;
    }
  }

  writeFileSync(mdPath, md);

  console.log(`\n✅ Résultats sauvegardés`);
  console.log(`   JSON : ${jsonPath}`);
  console.log(`   MD   : ${mdPath}`);
  console.log(`\n🎯 Top 20 opportunités :`);
  for (const [i, d] of ranked.slice(0, 20).entries()) {
    console.log(`   ${(i + 1).toString().padStart(2)}. ${d.domain.padEnd(40)} score=${d.score} hits=${d.hits}`);
  }
}

main().catch(e => { console.error('❌', e); process.exit(1); });
