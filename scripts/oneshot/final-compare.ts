import dotenv from 'dotenv';
dotenv.config();

import { getSupabase } from '../src/db/supabase.js';
import { getExistingSlugsFromFiles } from '../src/deployers/inject-pages.js';
import { sites } from '../config/sites.js';

async function main() {
  const db = getSupabase();

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ÉTAT FINAL — Supabase vs Fichiers vs Sitemap');
  console.log('═══════════════════════════════════════════════════════════════\n');

  for (const siteKey of Object.keys(sites)) {
    const { count } = await db
      .from('seo_pages')
      .select('*', { count: 'exact', head: true })
      .eq('site_key', siteKey);

    const { data: supabaseRows } = await db
      .from('seo_pages')
      .select('slug')
      .eq('site_key', siteKey);

    const fileSlugs = getExistingSlugsFromFiles(siteKey);
    const supabaseSlugs = new Set((supabaseRows || []).map((r: any) => r.slug));
    const fileSet = new Set(fileSlugs);

    const inBoth = Array.from(supabaseSlugs).filter(s => fileSet.has(s)).length;
    const onlySupa = Array.from(supabaseSlugs).filter(s => !fileSet.has(s));
    const onlyFile = fileSlugs.filter(s => !supabaseSlugs.has(s));

    const status = onlySupa.length === 0 && onlyFile.length === 0
      ? '✅ synced'
      : `⚠️  supa:${onlySupa.length} file:${onlyFile.length}`;

    console.log(`  ${siteKey.padEnd(14)} Supabase:${String(count || 0).padStart(3)}  Files:${String(fileSlugs.length).padStart(3)}  Common:${String(inBoth).padStart(3)}  ${status}`);

    if (onlySupa.length > 0) {
      console.log(`    Supabase-only: ${onlySupa.slice(0, 5).join(', ')}${onlySupa.length > 5 ? ` +${onlySupa.length - 5}` : ''}`);
    }
    if (onlyFile.length > 0) {
      console.log(`    File-only: ${onlyFile.slice(0, 5).join(', ')}${onlyFile.length > 5 ? ` +${onlyFile.length - 5}` : ''}`);
    }
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
