import dotenv from 'dotenv';
dotenv.config();

import { sites } from '../config/sites.js';
import { generateMatrix } from '../src/generators/city-service-matrix.js';
import { getExistingSlugs } from '../src/db/supabase.js';
import { getExistingSlugsFromFiles } from '../src/deployers/inject-pages.js';

async function main() {
  for (const siteKey of Object.keys(sites)) {
    const matrix = generateMatrix(siteKey);
    const supabaseSlugs = await getExistingSlugs(siteKey);
    const fileSlugs = getExistingSlugsFromFiles(siteKey);
    const allSlugs = [...new Set([...supabaseSlugs, ...fileSlugs])];
    const remaining = matrix.filter(p => !allSlugs.includes(p.slug));
    console.log(`${siteKey}: matrix=${matrix.length} | supabase=${supabaseSlugs.length} | files=${fileSlugs.length} | unique=${allSlugs.length} | remaining=${remaining.length}`);
  }
}

main();
