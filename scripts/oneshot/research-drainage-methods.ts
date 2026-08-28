import { getSearchVolume, getKeywordIdeas } from '../src/keywords/dataforseo.js';
import * as fs from 'fs';

const METHODS_FR = [
  // Renata Franca
  'renata franca',
  'méthode renata franca',
  'massage renata franca',
  'drainage renata franca',
  'drainage lymphatique renata franca',
  'renata franca perpignan',
  'renata franca avis',
  'renata franca resultat',
  // Vodder
  'méthode vodder',
  'drainage vodder',
  'drainage lymphatique vodder',
  'vodder perpignan',
  // Leduc
  'méthode leduc',
  'drainage leduc',
  'drainage lymphatique leduc',
  // Autres méthodes courantes
  'drainage lymphatique manuel',
  'drainage brésilien',
  'drainage brasilien',
  'massage brésilien',
  'massage drainant',
  'drainage esthétique',
];

async function main() {
  console.log(`→ Search volume pour ${METHODS_FR.length} kw...`);
  const data = await getSearchVolume(METHODS_FR);

  const rows = METHODS_FR.map(k => {
    const d = data.get(k.toLowerCase());
    return {
      kw: k,
      vol: d?.searchVolume ?? 0,
      cpc: d?.cpc ?? null,
      comp: d?.competition ?? null,
    };
  }).sort((a, b) => b.vol - a.vol);

  const lines: string[] = [];
  lines.push('# Drainage lymphatique — comparatif méthodes (volume FR)\n');
  lines.push('| Keyword | Vol/mo | CPC € | Concurrence |');
  lines.push('|---|---|---|---|');
  rows.forEach(r => {
    lines.push(`| ${r.kw} | ${r.vol.toLocaleString('fr-FR')} | ${r.cpc?.toFixed(2) ?? '—'} | ${r.comp ?? '—'} |`);
  });

  // Bonus : ideas pour "renata franca"
  console.log(`\n→ Ideas "renata franca" (longue traîne)...`);
  const ideas = await getKeywordIdeas(['renata franca'], 60);
  const filtered = ideas.filter(i => i.searchVolume >= 30 && /renata|franca|drainage/i.test(i.keyword));

  lines.push('\n## Longue traîne "renata franca" (volume ≥30)\n');
  lines.push('| Keyword | Vol/mo | KD | CPC € |');
  lines.push('|---|---|---|---|');
  filtered.slice(0, 30).forEach(i => {
    lines.push(`| ${i.keyword} | ${i.searchVolume} | ${i.keywordDifficulty ?? '—'} | ${i.cpc?.toFixed(2) ?? '—'} |`);
  });

  fs.writeFileSync('/home/ubuntu/sites/seo-automation/reports/drainage-methods.md', lines.join('\n'));
  console.log('\n✓ /home/ubuntu/sites/seo-automation/reports/drainage-methods.md');
}

main().catch(e => { console.error(e); process.exit(1); });
