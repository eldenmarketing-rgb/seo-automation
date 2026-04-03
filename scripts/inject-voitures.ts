import dotenv from 'dotenv';
dotenv.config();

import { getSupabase, SeoPageRow } from '../src/db/supabase.js';
import { injectPages, getExistingSlugsFromFiles } from '../src/deployers/inject-pages.js';

async function main() {
  const db = getSupabase();

  const { data: supabasePages } = await db
    .from('seo_pages')
    .select('*')
    .eq('site_key', 'voitures');

  const fileSlugs = new Set(getExistingSlugsFromFiles('voitures'));
  console.log(`File slugs: ${fileSlugs.size}`);

  const toInject = (supabasePages || []).filter((r: any) => !fileSlugs.has(r.slug));
  console.log(`Pages to inject: ${toInject.length}`);

  for (const p of toInject) {
    console.log(`  → ${p.slug} (${p.city})`);
  }

  if (toInject.length > 0) {
    const injected = await injectPages('voitures', toInject as SeoPageRow[]);
    console.log(`\nInjected: ${injected.length}`);
    for (const s of injected) console.log(`  ✅ ${s}`);
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
