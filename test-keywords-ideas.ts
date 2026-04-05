import { getKeywordIdeas } from './src/keywords/dataforseo.js';

async function main() {
  const seeds = [
    "vidange voiture",
    "garage automobile",
    "entretien voiture",
    "réparation auto",
    "frein voiture",
    "diagnostic auto"
  ];

  console.log(`Seeds: ${seeds.join(', ')}\n`);

  const results = await getKeywordIdeas(seeds, 100);

  console.log(`\nTotal: ${results.length} keyword ideas\n`);
  console.log('Rank | Mot-clé | Volume | CPC | KD');
  console.log('-----|---------|--------|-----|---');

  for (let i = 0; i < Math.min(50, results.length); i++) {
    const kw = results[i];
    const cpc = kw.cpc ? `${kw.cpc.toFixed(2)}€` : 'n/a';
    console.log(`${String(i + 1).padStart(3)}  | ${kw.keyword.padEnd(50)} | ${String(kw.searchVolume).padStart(8)} | ${cpc.padStart(7)} | ${kw.keywordDifficulty}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
