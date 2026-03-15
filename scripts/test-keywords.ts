import { researchKeywords, suggestPages } from '../src/keywords/research.js';

async function main() {
  const kws = await researchKeywords('taxi', 'perpignan');
  console.log('Total:', kws.length, 'mots-clés\n');

  console.log('=== COURTE TRAINE ===');
  kws.filter(k => k.type === 'short').slice(0, 10).forEach(k => console.log(' ', k.keyword));

  console.log('\n=== LONGUE TRAINE ===');
  kws.filter(k => k.type === 'long').slice(0, 15).forEach(k => console.log(' ', k.keyword));

  const pages = suggestPages(kws, 'taxi', 'perpignan');
  console.log('\n=== PAGES SUGGEREES ===');
  pages.forEach(p => {
    console.log(`\n${p.type} — ${p.title}`);
    p.targetKeywords.slice(0, 5).forEach(k => console.log('    •', k));
  });
}

main();
