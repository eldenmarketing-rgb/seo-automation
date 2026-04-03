import { getSupabase } from '../src/db/supabase.ts';
import { getExistingSlugsFromFiles } from '../src/deployers/inject-pages.ts';
import { sites } from '../config/sites.ts';

async function main() {
  const db = getSupabase();

  for (const siteKey of Object.keys(sites)) {
    const { data, count } = await db
      .from('seo_pages')
      .select('slug, status', { count: 'exact' })
      .eq('site_key', siteKey);

    const statuses: Record<string, number> = {};
    for (const row of data || []) {
      statuses[row.status] = (statuses[row.status] || 0) + 1;
    }

    const fileSlugs = getExistingSlugsFromFiles(siteKey);

    const supabaseSlugs = new Set((data || []).map((r: any) => r.slug));
    const fileSet = new Set(fileSlugs);
    const inBoth = Array.from(supabaseSlugs).filter(s => fileSet.has(s));
    const onlySupabase = Array.from(supabaseSlugs).filter(s => !fileSet.has(s));
    const onlyFiles = fileSlugs.filter(s => !supabaseSlugs.has(s));

    console.log('═══════════════════════════════════════');
    console.log(`${siteKey.toUpperCase()} (${sites[siteKey].name})`);
    console.log(`  Supabase: ${count || 0} pages ${JSON.stringify(statuses)}`);
    console.log(`  Fichiers: ${fileSlugs.length} slugs`);
    console.log(`  En commun: ${inBoth.length}`);
    if (onlySupabase.length > 0) {
      console.log(`  Supabase seulement (${onlySupabase.length}):`);
      for (const s of onlySupabase.slice(0, 8)) console.log(`    - ${s}`);
      if (onlySupabase.length > 8) console.log(`    ... +${onlySupabase.length - 8}`);
    }
    if (onlyFiles.length > 0) {
      console.log(`  Fichiers seulement (${onlyFiles.length}):`);
      for (const s of onlyFiles.slice(0, 8)) console.log(`    + ${s}`);
      if (onlyFiles.length > 8) console.log(`    ... +${onlyFiles.length - 8}`);
    }
    if (onlySupabase.length === 0 && onlyFiles.length === 0) {
      console.log(`  → Parfaitement synchronisé`);
    }
  }
}

main().catch(console.error);
