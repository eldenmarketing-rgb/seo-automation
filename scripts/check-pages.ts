import { getExistingSlugs } from '../src/db/supabase.js';
import { getExistingSlugsFromFiles } from '../src/deployers/inject-pages.js';

async function main() {
  for (const site of ['garage', 'vtc']) {
    const dbSlugs = await getExistingSlugs(site);
    const fileSlugs = getExistingSlugsFromFiles(site);
    console.log(`${site}:`);
    console.log(`  Supabase: ${dbSlugs.length} pages`);
    console.log(`  Fichiers: ${fileSlugs.length} pages`);
    if (dbSlugs.length > 0) console.log(`  DB: ${dbSlugs.slice(0, 5).join(', ')}`);
    console.log(`  Files: ${fileSlugs.slice(0, 10).join(', ')}`);
    console.log('');
  }
}
main();
