import { getSearchVolume } from '../src/keywords/dataforseo.js';
import * as fs from 'fs';

const KWS = [
  'lymphodrainage',
  'lymphodrainage esthétique',
  'lymphodrainage manuel',
  'lymphodrainage perpignan',
  'lymphodrainage à domicile',
  'lymphodrainage jambes',
  'lymphodrainage cellulite',
  'lymphodrainage visage',
  'lymphodrainage renata franca',
  'lymphodrainage vodder',
  // comparaison
  'drainage lymphatique',
  'drainage lymphatique perpignan',
  'drainage lymphatique esthétique',
  'drainage lymphatique à domicile',
  'drainage lymphatique cellulite',
  'drainage lymphatique jambes lourdes',
  'drainage lymphatique post partum',
  'drainage lymphatique rétention d\'eau',
  // autres variantes
  'soin drainant',
  'massage drainant perpignan',
  'jambes lourdes solution',
  'rétention d\'eau que faire',
];

async function main() {
  console.log(`→ Volumes ${KWS.length} kw (lymphodrainage vs drainage)...`);
  const data = await getSearchVolume(KWS);

  const rows = KWS.map(k => {
    const d = data.get(k.toLowerCase());
    return { kw: k, vol: d?.searchVolume ?? 0, cpc: d?.cpc ?? null, comp: d?.competition ?? null };
  }).sort((a, b) => b.vol - a.vol);

  const lines: string[] = [];
  lines.push('# Lymphodrainage vs Drainage lymphatique\n');
  lines.push('| Keyword | Vol/mo | CPC € | Concurrence |');
  lines.push('|---|---|---|---|');
  rows.forEach(r => {
    lines.push(`| ${r.kw} | ${r.vol.toLocaleString('fr-FR')} | ${r.cpc?.toFixed(2) ?? '—'} | ${r.comp ?? '—'} |`);
  });

  const lympho = rows.filter(r => /^lymphodrainage/i.test(r.kw)).reduce((s, r) => s + r.vol, 0);
  const drainage = rows.filter(r => /^drainage lymphatique/i.test(r.kw)).reduce((s, r) => s + r.vol, 0);
  lines.push(`\n## Totaux\n`);
  lines.push(`- **lymphodrainage** cumulé : ${lympho.toLocaleString('fr-FR')}/mo`);
  lines.push(`- **drainage lymphatique** cumulé : ${drainage.toLocaleString('fr-FR')}/mo`);
  lines.push(`- Ratio drainage/lympho : ${(drainage / Math.max(lympho, 1)).toFixed(1)}×`);

  fs.writeFileSync('/home/ubuntu/sites/seo-automation/reports/lymphodrainage-vs-drainage.md', lines.join('\n'));
  console.log('\n✓ /home/ubuntu/sites/seo-automation/reports/lymphodrainage-vs-drainage.md');
}

main().catch(e => { console.error(e); process.exit(1); });
