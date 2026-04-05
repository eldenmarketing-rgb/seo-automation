import { fullKeywordResearch } from './src/keywords/dataforseo.js';

async function main() {
  const result = await fullKeywordResearch('garage perpignan');
  console.log(JSON.stringify(result, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
