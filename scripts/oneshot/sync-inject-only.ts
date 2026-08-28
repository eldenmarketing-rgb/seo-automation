/**
 * Re-run Part B only: inject Supabase-only pages into site data files.
 * Then show final comparison.
 */
import dotenv from 'dotenv';
dotenv.config();

import { sites } from '../config/sites.js';
import { getSupabase, SeoPageRow } from '../src/db/supabase.js';
import { injectPages, getExistingSlugsFromFiles } from '../src/deployers/inject-pages.js';

async function main() {
  const db = getSupabase();

  for (const siteKey of ['garage', 'vtc']) {
    console.log(`\n── ${siteKey.toUpperCase()} — Supabase → Files ──`);

    const { data: supabasePages } = await db
      .from('seo_pages')
      .select('*')
      .eq('site_key', siteKey);

    const fileSlugs = new Set(getExistingSlugsFromFiles(siteKey));
    console.log(`  File slugs detected: ${fileSlugs.size}`);

    const supabaseOnly = (supabasePages || []).filter((r: any) => !fileSlugs.has(r.slug));
    console.log(`  Supabase-only: ${supabaseOnly.length}`);

    if (supabaseOnly.length === 0) {
      console.log('  Already synced.');
      continue;
    }

    // Show what will be injected
    for (const p of supabaseOnly) {
      console.log(`    → ${p.slug} (${p.page_type})`);
    }

    const injectedSlugs = await injectPages(siteKey, supabaseOnly as SeoPageRow[]);
    console.log(`  Actually injected: ${injectedSlugs.length}`);
  }

  // Final report
  console.log('\n\n═══ FINAL STATE ═══\n');
  for (const siteKey of Object.keys(sites)) {
    const { count } = await db.from('seo_pages').select('*', { count: 'exact', head: true }).eq('site_key', siteKey);
    const fileSlugs = getExistingSlugsFromFiles(siteKey);
    const { data: supabaseRows } = await db.from('seo_pages').select('slug').eq('site_key', siteKey);
    const supabaseSlugs = new Set((supabaseRows || []).map((r: any) => r.slug));
    const fileSet = new Set(fileSlugs);
    const inBoth = Array.from(supabaseSlugs).filter(s => fileSet.has(s)).length;
    const onlySupa = Array.from(supabaseSlugs).filter(s => !fileSet.has(s)).length;
    const onlyFile = fileSlugs.filter(s => !supabaseSlugs.has(s)).length;
    const status = onlySupa === 0 && onlyFile === 0 ? '✅ synced' : `⚠️  supa:${onlySupa} file:${onlyFile}`;
    console.log(`  ${siteKey.padEnd(14)} Supabase:${String(count || 0).padStart(3)}  Files:${String(fileSlugs.length).padStart(3)}  Common:${String(inBoth).padStart(3)}  ${status}`);
  }
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
