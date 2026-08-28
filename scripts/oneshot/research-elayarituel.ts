/**
 * Keyword research for Elayarituel (masseuse à domicile Perpignan, femme uniquement)
 *
 * Seeds :
 * - massage perpignan (principal supposé)
 * - massage ayurvédique
 * - drainage lymphatique
 * - massage domicile
 *
 * Sortie : CSV + top par service avec volume/KD/CPC.
 */

import { getKeywordIdeas, getSearchVolume } from '../src/keywords/dataforseo.js';
import * as fs from 'fs';
import * as path from 'path';

const SEEDS = [
  'massage perpignan',
  'massage ayurvédique',
  'drainage lymphatique',
  'massage à domicile',
  'massage femme',
  'massage bien-être perpignan',
];

const OUT_DIR = '/home/ubuntu/sites/seo-automation/reports';

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const all = new Map<string, { keyword: string; vol: number; kd: number; cpc: number | null; seed: string }>();

  for (const seed of SEEDS) {
    console.log(`\n→ Ideas pour "${seed}"...`);
    const ideas = await getKeywordIdeas([seed], 80);
    for (const i of ideas) {
      if (!i.keyword || i.searchVolume < 10) continue;
      const existing = all.get(i.keyword.toLowerCase());
      if (!existing || existing.vol < i.searchVolume) {
        all.set(i.keyword.toLowerCase(), {
          keyword: i.keyword,
          vol: i.searchVolume,
          kd: i.keywordDifficulty || 0,
          cpc: i.cpc,
          seed,
        });
      }
    }
  }

  const rows = [...all.values()].sort((a, b) => b.vol - a.vol);
  console.log(`\n✓ ${rows.length} keywords uniques collectés`);

  // Export CSV
  const csvPath = path.join(OUT_DIR, 'elayarituel-keywords.csv');
  const csv = [
    'keyword,volume,kd,cpc,seed',
    ...rows.map(r => `"${r.keyword}",${r.vol},${r.kd},${r.cpc ?? ''},"${r.seed}"`),
  ].join('\n');
  fs.writeFileSync(csvPath, csv);
  console.log(`CSV → ${csvPath}`);

  // Regroupement par thème service
  const buckets: Record<string, typeof rows> = {
    'massage perpignan (géo général)': [],
    'massage à domicile': [],
    'ayurvédique / abhyanga': [],
    'drainage lymphatique': [],
    'massage relaxant / bien-être': [],
    'massage pierres chaudes': [],
    'massage prénatal / grossesse': [],
    'massage femme enceinte': [],
    'massage californien': [],
    'massage suédois': [],
    'massage thaï': [],
    'massage sportif / récupération': [],
    'massage crânien / kobido': [],
    'réflexologie': [],
    'aromathérapie': [],
    'pieds / mains / dos (ciblé)': [],
    'autre (à trier)': [],
  };

  const classify = (kw: string): keyof typeof buckets => {
    const k = kw.toLowerCase();
    if (/(ayurv|abhyanga|shirodhara)/.test(k)) return 'ayurvédique / abhyanga';
    if (/(drainage|lymphatique|vodder|leduc)/.test(k)) return 'drainage lymphatique';
    if (/(pierre chaude|pierres chaudes|hot stone)/.test(k)) return 'massage pierres chaudes';
    if (/(prénatal|prenatal)/.test(k)) return 'massage prénatal / grossesse';
    if (/(enceinte|grossesse)/.test(k)) return 'massage femme enceinte';
    if (/(californien)/.test(k)) return 'massage californien';
    if (/(suédois|suedois)/.test(k)) return 'massage suédois';
    if (/(thaï|thai)/.test(k)) return 'massage thaï';
    if (/(sportif|sport|récupération|recuperation|muscle|musculaire)/.test(k)) return 'massage sportif / récupération';
    if (/(kobido|crânien|cranien|visage)/.test(k)) return 'massage crânien / kobido';
    if (/(réflexo|reflexo|pied|mains|dos)/.test(k)) return 'pieds / mains / dos (ciblé)';
    if (/(aromath|huile essentielle)/.test(k)) return 'aromathérapie';
    if (/(relax|détente|detente|bien[-\s]?être|bien[-\s]?etre)/.test(k)) return 'massage relaxant / bien-être';
    if (/(à domicile|a domicile|domicile)/.test(k)) return 'massage à domicile';
    if (/perpignan|66|pyrénées/.test(k)) return 'massage perpignan (géo général)';
    return 'autre (à trier)';
  };

  for (const r of rows) buckets[classify(r.keyword)].push(r);

  // Report MD
  const mdLines: string[] = [];
  mdLines.push('# Recherche keywords Elayarituel — masseuse femme à domicile Perpignan');
  mdLines.push(`\nTotal: **${rows.length} keywords**, volume cumulé: **${rows.reduce((s, r) => s + r.vol, 0).toLocaleString('fr-FR')}/mois**\n`);
  mdLines.push('## Volume total par thème service\n');
  mdLines.push('| Thème | Nb kw | Volume cumulé | Top kw |');
  mdLines.push('|---|---|---|---|');
  const themes = Object.entries(buckets)
    .map(([name, list]) => ({
      name,
      count: list.length,
      totalVol: list.reduce((s, r) => s + r.vol, 0),
      top: list[0],
    }))
    .sort((a, b) => b.totalVol - a.totalVol);
  for (const t of themes) {
    if (t.count === 0) continue;
    const topLabel = t.top ? `${t.top.keyword} (${t.top.vol}/mo, KD${t.top.kd})` : '—';
    mdLines.push(`| ${t.name} | ${t.count} | ${t.totalVol.toLocaleString('fr-FR')} | ${topLabel} |`);
  }

  mdLines.push('\n## Top 40 keywords (tous confondus)\n');
  mdLines.push('| # | Keyword | Vol | KD | CPC€ |');
  mdLines.push('|---|---|---|---|---|');
  rows.slice(0, 40).forEach((r, i) => {
    mdLines.push(`| ${i + 1} | ${r.keyword} | ${r.vol} | ${r.kd} | ${r.cpc?.toFixed(2) ?? '—'} |`);
  });

  mdLines.push('\n## Détail par thème\n');
  for (const [name, list] of Object.entries(buckets)) {
    if (list.length === 0) continue;
    mdLines.push(`\n### ${name} (${list.length} kw, ${list.reduce((s, r) => s + r.vol, 0)}/mo)\n`);
    mdLines.push('| Keyword | Vol | KD | CPC€ |');
    mdLines.push('|---|---|---|---|');
    list.slice(0, 15).forEach((r) => {
      mdLines.push(`| ${r.keyword} | ${r.vol} | ${r.kd} | ${r.cpc?.toFixed(2) ?? '—'} |`);
    });
  }

  const mdPath = path.join(OUT_DIR, 'elayarituel-keywords.md');
  fs.writeFileSync(mdPath, mdLines.join('\n'));
  console.log(`MD → ${mdPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
